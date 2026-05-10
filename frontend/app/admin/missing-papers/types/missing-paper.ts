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
  
    status: "missing" | "under_review" | "approved" | "rejected";
  
    uploader_name?: string;
    description?: string;
  
    temp_pdf_url?: string;
    final_pdf_url?: string;
  
    reviewed_by?: string;
    reviewed_at?: string;
  
    created_at?: string;
  }