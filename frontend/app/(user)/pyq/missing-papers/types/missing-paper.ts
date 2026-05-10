export interface MissingPaper {
    _id: string;
  
    semester_code: string;
    req_semester_code: string;
    branch_code: string;
  
    name: string;
    subject_code: string;
    req_paper_code: string;
  
    year: string;
  
    exam_type: string;
    paper_type: string;
  
    status:
      | "missing"
      | "under_review"
      | "approved"
      | "rejected";
  
    uploader_name?: string;
  
    description?: string;
  }