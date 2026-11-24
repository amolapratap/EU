from datetime import datetime, timezone
from typing import Optional, Union, List, Dict, Any
from bson import ObjectId
from fastapi import HTTPException

from app.database import db_instance
from app.utils.mongo_serializer import mongo_to_json


async def ensure_elective_indexes():
    """
    Ensure performance indexes on the elective_subjects collection.
    """
    try:
        await db_instance.db.elective_subjects.create_index(
            [("semester_code", 1), ("branch_code", 1)],
            name="elective_sem_branch_idx"
        )
        await db_instance.db.elective_subjects.create_index(
            [("subjects.subject_id", 1)],
            name="elective_child_subject_idx"
        )
    except Exception as e:
        print(f"Notice: Index setup on elective_subjects: {e}")


# =========================================================================
# V2 SUBJECTS (REGULAR SUBJECTS + ELECTIVE GROUPS WITH CHILD SUBJECT DATA)
# =========================================================================

async def get_v2_subjects_ctrl(semester_code: Union[str, int], branch_code: str) -> Dict[str, Any]:
    """
    V2 Subjects API:
    Returns regular/mandatory subjects AND elective groups for the specified semester + branch.
    Child subjects belonging to an elective group are excluded from the top-level regular_subjects.
    """
    sem_str = str(semester_code).strip()
    branch_str = str(branch_code).strip()

    if not sem_str or not branch_str:
        raise HTTPException(status_code=400, detail="semester_code and branch_code are required")

    # 1. Fetch elective groups for requested semester + branch
    # MongoDB equality on branch_code automatically matches if branch_code is string or in array
    elective_query = {
        "semester_code": sem_str,
        "branch_code": branch_str
    }
    elective_docs = await db_instance.db.elective_subjects.find(elective_query).sort("short_name", 1).to_list(None)

    # 2. Collect all child subject IDs from the elective groups
    elective_subject_ids = set()
    for eg in elective_docs:
        for child in eg.get("subjects", []):
            sid = child.get("subject_id")
            if sid:
                if isinstance(sid, str) and ObjectId.is_valid(sid):
                    elective_subject_ids.add(ObjectId(sid))
                elif isinstance(sid, ObjectId):
                    elective_subject_ids.add(sid)

    # 3. Fetch all subjects for this semester + branch from the Subject collection
    subject_query = {
        "semester_code": sem_str,
        "branch_code": branch_str
    }
    all_subjects = await db_instance.db.subjects.find(subject_query).sort("code", 1).to_list(None)
    subject_dict = {s["_id"]: s for s in all_subjects}

    # Enrich elective groups with credit, type, and max_marks from child subjects
    for eg in elective_docs:
        eg_credit = None
        eg_type = "Theory"
        eg_max_marks = 100
        enriched_children = []
        for child in eg.get("subjects", []):
            sid = child.get("subject_id")
            if isinstance(sid, str) and ObjectId.is_valid(sid):
                oid = ObjectId(sid)
            elif isinstance(sid, ObjectId):
                oid = sid
            else:
                oid = None
            if oid and oid in subject_dict:
            child_dict = {
                "subject_id": str(oid) if oid else str(child.get("subject_id", "")),
                "_id": str(oid) if oid else str(child.get("subject_id", "")),
                "code": cs.get("code") if oid and oid in subject_dict else child.get("code", ""),
                "short_name": (cs.get("short_name") or child.get("short_name")) if oid and oid in subject_dict else child.get("short_name", ""),
                "full_name": (cs.get("name") or cs.get("full_name") or child.get("full_name")) if oid and oid in subject_dict else child.get("full_name", ""),
                "name": (cs.get("name") or cs.get("full_name") or child.get("full_name")) if oid and oid in subject_dict else child.get("full_name", ""),
                "subject_credit": cs.get("subject_credit") if oid and oid in subject_dict else child.get("subject_credit", "3"),
                "subject_type": cs.get("subject_type", "Theory") if oid and oid in subject_dict else child.get("subject_type", "Theory"),
                "max_marks": cs.get("max_marks", 100) if oid and oid in subject_dict else child.get("max_marks", 100),
                "group_id": str(eg["_id"]),
                "group_code": eg.get("code") or eg.get("short_name") or "ELECTIVE",
                "group_name": eg.get("full_name") or eg.get("group_name") or eg.get("short_name") or "Elective Group",
                "is_elective": True,
            }
            if oid and oid in subject_dict:
                cs = subject_dict[oid]
                if eg_credit is None and cs.get("subject_credit"):
                    eg_credit = float(cs["subject_credit"])
                    eg_type = cs.get("subject_type", "Theory")
                    eg_max_marks = int(cs.get("max_marks", 100))
            enriched_children.append(child_dict)
        
        eg["subjects"] = enriched_children
        eg["code"] = eg.get("code") or eg.get("short_name") or f"ELEC_{str(eg['_id'])}"
        eg["subject_credit"] = eg_credit if eg_credit is not None else 3.0
        eg["subject_type"] = eg_type
        eg["max_marks"] = eg_max_marks
        eg["is_elective"] = True
        eg["name"] = eg.get("full_name")

    # 4. Separate regular subjects (subjects whose _id is NOT in elective_subject_ids)
    regular_subjects = [
        s for s in all_subjects
        if s["_id"] not in elective_subject_ids
    ]

    regular_json = [mongo_to_json(s) for s in regular_subjects]
    electives_json = [mongo_to_json(eg) for eg in elective_docs]

    return {
        "success": True,
        "data": {
            "regular_subjects": regular_json,
            "electives": electives_json
        },
        "regular_subjects": regular_json,
        "electives": electives_json
    }


# =========================================================================
# VALIDATION HELPERS FOR ELECTIVE GROUPS
# =========================================================================

async def _validate_child_subjects(raw_subjects: List[Any]) -> List[Dict[str, Any]]:
    """
    Validates that:
    1. Child subjects list is not empty.
    2. Every child subject has a valid subject_id.
    3. No duplicate subject_id exists inside the same elective group.
    4. Every subject_id references an existing Subject in db.subjects.
    5. Fills missing short_name/full_name from the referenced Subject.
    """
    if not isinstance(raw_subjects, list) or len(raw_subjects) == 0:
        raise HTTPException(
            status_code=400,
            detail="Elective group must contain a non-empty 'subjects' list"
        )

    sids: List[ObjectId] = []
    items_to_process = []

    for item in raw_subjects:
        if hasattr(item, "model_dump"):
            item_dict = item.model_dump()
        elif hasattr(item, "dict"):
            item_dict = item.dict()
        elif isinstance(item, dict):
            item_dict = item
        else:
            raise HTTPException(status_code=400, detail="Invalid child subject format")

        raw_sid = item_dict.get("subject_id")
        sid_str = str(raw_sid).strip() if raw_sid else ""

        if not sid_str or not ObjectId.is_valid(sid_str):
            raise HTTPException(status_code=400, detail=f"Invalid child subject_id: '{sid_str}'")

        oid = ObjectId(sid_str)
        sids.append(oid)
        items_to_process.append((oid, item_dict))

    # Prevent duplicate child subjects inside the same elective group
    if len(sids) != len(set(sids)):
        raise HTTPException(
            status_code=400,
            detail="Duplicate subject_id found inside the same elective group"
        )

    # Verify all referenced subjects actually exist in db.subjects
    existing_subjects = await db_instance.db.subjects.find(
        {"_id": {"$in": sids}},
        {"_id": 1, "short_name": 1, "full_name": 1, "code": 1}
    ).to_list(None)

    existing_map = {s["_id"]: s for s in existing_subjects}

    for oid in sids:
        if oid not in existing_map:
            raise HTTPException(
                status_code=400,
                detail=f"Subject with ID '{str(oid)}' does not exist in the subjects database"
            )

    validated_children = []
    for oid, item_dict in items_to_process:
        subj = existing_map[oid]
        short_name = (item_dict.get("short_name") or "").strip() or subj.get("short_name", "")
        full_name = (item_dict.get("full_name") or "").strip() or subj.get("full_name", "")

        validated_children.append({
            "subject_id": oid,
            "short_name": short_name,
            "full_name": full_name
        })

    return validated_children


# =========================================================================
# ADMIN CRUD CONTROLLERS FOR ELECTIVE GROUPS
# =========================================================================

async def admin_list_electives(semester: Optional[str] = None, branch: Optional[str] = None) -> Dict[str, Any]:
    """
    List elective groups, optionally filtered by semester and/or branch.
    """
    query: Dict[str, Any] = {}
    if semester:
        query["semester_code"] = str(semester).strip()
    if branch:
        query["branch_code"] = str(branch).strip()

    docs = await db_instance.db.elective_subjects.find(query).sort("short_name", 1).to_list(None)
    return {
        "success": True,
        "count": len(docs),
        "data": [mongo_to_json(d) for d in docs]
    }


async def admin_get_elective(elective_id: str) -> Dict[str, Any]:
    """
    Get a single elective group by ID.
    """
    if not ObjectId.is_valid(elective_id):
        raise HTTPException(status_code=400, detail="Invalid elective group ID")

    doc = await db_instance.db.elective_subjects.find_one({"_id": ObjectId(elective_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Elective group not found")

    return {
        "success": True,
        "data": mongo_to_json(doc)
    }


async def admin_create_elective(body: Any, admin: dict) -> Dict[str, Any]:
    """
    Create a new elective group.
    """
    if hasattr(body, "model_dump"):
        data = body.model_dump()
    elif hasattr(body, "dict"):
        data = body.dict()
    elif isinstance(body, dict):
        data = body
    else:
        raise HTTPException(status_code=400, detail="Invalid request body")

    semester_code = str(data.get("semester_code") or "").strip()
    if not semester_code:
        raise HTTPException(status_code=400, detail="semester_code is required")

    branch_code = data.get("branch_code")
    if not branch_code:
        raise HTTPException(status_code=400, detail="branch_code is required")

    if isinstance(branch_code, str):
        branch_code = branch_code.strip()
    elif isinstance(branch_code, list):
        branch_code = [str(b).strip() for b in branch_code if str(b).strip()]
        if not branch_code:
            raise HTTPException(status_code=400, detail="branch_code list cannot be empty")
    else:
        raise HTTPException(status_code=400, detail="branch_code must be string or list of strings")

    short_name = str(data.get("short_name") or "").strip()
    if not short_name:
        raise HTTPException(status_code=400, detail="short_name is required")

    full_name = str(data.get("full_name") or "").strip()
    if not full_name:
        raise HTTPException(status_code=400, detail="full_name is required")

    # code is OPTIONAL
    code_raw = data.get("code")
    code = str(code_raw).strip() if code_raw and str(code_raw).strip() else None

    # Validate child subjects
    validated_children = await _validate_child_subjects(data.get("subjects", []))

    admin_userid = admin.get("admin_userid") if isinstance(admin, dict) else None
    now = datetime.now(timezone.utc)

    doc = {
        "semester_code": semester_code,
        "branch_code": branch_code,
        "code": code,
        "short_name": short_name,
        "full_name": full_name,
        "subjects": validated_children,
        "created_at": now,
        "updated_at": now,
        "admin_userids": [admin_userid] if admin_userid else []
    }

    res = await db_instance.db.elective_subjects.insert_one(doc)
    doc["_id"] = res.inserted_id

    return {
        "success": True,
        "message": "Elective group created successfully",
        "data": mongo_to_json(doc)
    }


async def admin_update_elective(elective_id: str, body: Any, admin: dict) -> Dict[str, Any]:
    """
    Update an existing elective group.
    """
    if not ObjectId.is_valid(elective_id):
        raise HTTPException(status_code=400, detail="Invalid elective group ID")

    elective_oid = ObjectId(elective_id)
    existing = await db_instance.db.elective_subjects.find_one({"_id": elective_oid})
    if not existing:
        raise HTTPException(status_code=404, detail="Elective group not found")

    if hasattr(body, "model_dump"):
        data = body.model_dump(exclude_unset=True)
    elif hasattr(body, "dict"):
        data = body.dict(exclude_unset=True)
    elif isinstance(body, dict):
        data = body
    else:
        raise HTTPException(status_code=400, detail="Invalid request body")

    update_set: Dict[str, Any] = {
        "updated_at": datetime.now(timezone.utc)
    }

    if "semester_code" in data:
        sem_str = str(data["semester_code"]).strip()
        if not sem_str:
            raise HTTPException(status_code=400, detail="semester_code cannot be empty")
        update_set["semester_code"] = sem_str

    if "branch_code" in data:
        branch_code = data["branch_code"]
        if isinstance(branch_code, str):
            branch_code = branch_code.strip()
        elif isinstance(branch_code, list):
            branch_code = [str(b).strip() for b in branch_code if str(b).strip()]
            if not branch_code:
                raise HTTPException(status_code=400, detail="branch_code list cannot be empty")
        else:
            raise HTTPException(status_code=400, detail="branch_code must be string or list of strings")
        update_set["branch_code"] = branch_code

    if "short_name" in data:
        short_name = str(data["short_name"]).strip()
        if not short_name:
            raise HTTPException(status_code=400, detail="short_name cannot be empty")
        update_set["short_name"] = short_name

    if "full_name" in data:
        full_name = str(data["full_name"]).strip()
        if not full_name:
            raise HTTPException(status_code=400, detail="full_name cannot be empty")
        update_set["full_name"] = full_name

    if "code" in data:
        code_raw = data["code"]
        update_set["code"] = str(code_raw).strip() if code_raw and str(code_raw).strip() else None

    if "subjects" in data:
        validated_children = await _validate_child_subjects(data["subjects"])
        update_set["subjects"] = validated_children

    admin_userid = admin.get("admin_userid") if isinstance(admin, dict) else None
    update_ops: Dict[str, Any] = {"$set": update_set}
    if admin_userid:
        update_ops["$addToSet"] = {"admin_userids": admin_userid}

    await db_instance.db.elective_subjects.update_one(
        {"_id": elective_oid},
        update_ops
    )

    updated_doc = await db_instance.db.elective_subjects.find_one({"_id": elective_oid})
    return {
        "success": True,
        "message": "Elective group updated successfully",
        "data": mongo_to_json(updated_doc)
    }


async def admin_delete_elective(elective_id: str) -> Dict[str, Any]:
    """
    Delete an elective group.
    Child subjects in db.subjects remain untouched.
    """
    if not ObjectId.is_valid(elective_id):
        raise HTTPException(status_code=400, detail="Invalid elective group ID")

    res = await db_instance.db.elective_subjects.delete_one({"_id": ObjectId(elective_id)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Elective group not found")

    return {
        "success": True,
        "message": "Elective group deleted successfully"
    }


# =========================================================================
# SYNCHRONIZATION HELPERS WHEN SUBJECTS ARE MODIFIED OR DELETED
# =========================================================================

async def sync_subject_in_electives(subject_id: ObjectId, short_name: Optional[str] = None, full_name: Optional[str] = None):
    """
    Keep stored child subject metadata synchronized if an admin edits short_name or full_name in db.subjects.
    """
    update_fields: Dict[str, Any] = {}
    if short_name:
        update_fields["subjects.$[elem].short_name"] = str(short_name).strip()
    if full_name:
        update_fields["subjects.$[elem].full_name"] = str(full_name).strip()

    if update_fields:
        await db_instance.db.elective_subjects.update_many(
            {"subjects.subject_id": subject_id},
            {"$set": update_fields},
            array_filters=[{"elem.subject_id": subject_id}]
        )


async def remove_subject_from_electives(subject_id: ObjectId):
    """
    If a subject is deleted from db.subjects, remove it from any elective groups.
    """
    await db_instance.db.elective_subjects.update_many(
        {"subjects.subject_id": subject_id},
        {"$pull": {"subjects": {"subject_id": subject_id}}}
    )
