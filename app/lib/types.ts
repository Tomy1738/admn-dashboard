// types.ts

export interface CountResult {
    count: string; // Use string if COUNT(*) returns a string, or number if it returns a number
  }
  
  export interface InvoiceStatusResult {
    paid: number;
    pending: number;
  }

// types.ts
export interface CustomersTableType {
    id: string;
    name: string;
    email: string;
    image_url: string;
    total_invoices: number;
    total_pending: number; // Change this to number
    total_paid: number; // Change this to number
  }


  
  
  