/**
 * Validates and transforms draft data from the database
 */
export function transformDraftData(data: unknown): BiographyDraft | null {
  console.log("Validating draft data:", data);
  
  // If data is null or undefined, return null
  if (!data) {
    console.warn("Draft data is null or undefined");
    return null;
  }

  // Check if data is an object with expected properties
  if (
    typeof data === "object" && 
    data !== null &&
    "id" in data &&
    "biography_id" in data &&
    "full_content" in data &&
    "chapter_content" in data
  ) {
    const draft = data as BiographyDraft;
    
    // Validate chapter_content is a valid object
    if (typeof draft.chapter_content !== 'object' || draft.chapter_content === null) {
      console.error("Invalid chapter_content format in draft data:", draft.chapter_content);
      draft.chapter_content = {}; // Default to empty object if invalid
    }
    
    return draft;
  }
  
  console.error("Draft data missing required properties:", data);
  return null;
}

/**
 * Type guard to check if an object is a string record
 */
export function isStringRecord(obj: unknown): obj is Record<string, string> {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  
  const record = obj as Record<string, unknown>;
  
  // Check if all values are strings
  return Object.values(record).every(value => typeof value === 'string');
}
