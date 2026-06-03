// ⚠️ AUTO-GENERATED — Do not edit manually
// Generated from supabase/migrations schema
// To regenerate: npm run db:generate

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      app_users: {
        Row: {
          id: string;
          auth_uid: string | null;
          login_name: string;
          display_name: string;
          email: string | null;
          phone: string | null;
          department: string | null;
          position: string | null;
          employee_id: string | null;
          language: string;
          is_active: boolean;
          last_login_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_uid?: string | null;
          login_name: string;
          display_name: string;
          email?: string | null;
          phone?: string | null;
          department?: string | null;
          position?: string | null;
          employee_id?: string | null;
          language?: string;
          is_active?: boolean;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_uid?: string | null;
          login_name?: string;
          display_name?: string;
          email?: string | null;
          phone?: string | null;
          department?: string | null;
          position?: string | null;
          employee_id?: string | null;
          language?: string;
          is_active?: boolean;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      roles: {
        Row: {
          id: string;
          code: string;
          name: string;
          name_th: string | null;
          description: string | null;
          is_system: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          name_th?: string | null;
          description?: string | null;
          is_system?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          name_th?: string | null;
          description?: string | null;
          is_system?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role_id: string;
          assigned_by: string | null;
          assigned_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role_id: string;
          assigned_by?: string | null;
          assigned_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role_id?: string;
          assigned_by?: string | null;
          assigned_at?: string;
        };
        Relationships: [
          { foreignKeyName: "user_roles_user_id_fkey"; columns: ["user_id"]; referencedRelation: "app_users"; referencedColumns: ["id"] },
          { foreignKeyName: "user_roles_role_id_fkey"; columns: ["role_id"]; referencedRelation: "roles"; referencedColumns: ["id"] },
        ];
      };
      role_rights: {
        Row: {
          id: string;
          role_id: string;
          right_id: string;
        };
        Insert: {
          id?: string;
          role_id: string;
          right_id: string;
        };
        Update: {
          id?: string;
          role_id?: string;
          right_id?: string;
        };
        Relationships: [
          { foreignKeyName: "role_rights_role_id_fkey"; columns: ["role_id"]; referencedRelation: "roles"; referencedColumns: ["id"] },
        ];
      };
      rights: {
        Row: {
          id: string;
          code: string;
          name: string;
          module_code: string;
          action: string;
          description: string | null;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          module_code: string;
          action: string;
          description?: string | null;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          module_code?: string;
          action?: string;
          description?: string | null;
        };
        Relationships: [];
      };
      vendors: {
        Row: {
          id: string;
          code: string;
          name_en: string;
          name_th: string | null;
          tax_id: string | null;
          address: string | null;
          phone: string | null;
          fax: string | null;
          email: string | null;
          website: string | null;
          attn: string | null;
          payment_term: number | null;
          credit_limit: number | null;
          is_active: boolean;
          total_amount: number;
          total_payment: number;
          open_amount: number;
          remark: string | null;
          wht_card_type: string | null;
          wht_card_no: string | null;
          wht_card_date: string | null;
          wht_card_expire: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name_en: string;
          name_th?: string | null;
          tax_id?: string | null;
          address?: string | null;
          phone?: string | null;
          fax?: string | null;
          email?: string | null;
          website?: string | null;
          attn?: string | null;
          payment_term?: number | null;
          credit_limit?: number | null;
          is_active?: boolean;
          total_amount?: number;
          total_payment?: number;
          open_amount?: number;
          remark?: string | null;
          wht_card_type?: string | null;
          wht_card_no?: string | null;
          wht_card_date?: string | null;
          wht_card_expire?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name_en?: string;
          name_th?: string | null;
          tax_id?: string | null;
          address?: string | null;
          phone?: string | null;
          fax?: string | null;
          email?: string | null;
          website?: string | null;
          attn?: string | null;
          payment_term?: number | null;
          credit_limit?: number | null;
          is_active?: boolean;
          total_amount?: number;
          total_payment?: number;
          open_amount?: number;
          remark?: string | null;
          wht_card_type?: string | null;
          wht_card_no?: string | null;
          wht_card_date?: string | null;
          wht_card_expire?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      invoices: {
        Row: {
          id: string;
          doc_number: string;
          doc_date: string;
          supplier_code: string;
          supplier_id: string | null;
          inv_number: string | null;
          inv_date: string | null;
          total_amount: number;
          due_days: number;
          due_date: string | null;
          remark: string | null;
          dr_amount: number;
          cr_amount: number;
          total_wht: number;
          vat_type: string;
          status: string;
          receive_voucher: string | null;
          vat_number: string | null;
          po_number: string | null;
          ap_type_code: string | null;
          wht_code: string | null;
          total_no_vat: number;
          total_vat: number;
          balance: number;
          period_month: string | null;
          period_year: string | null;
          paid_amount: number;
          cancelled_at: string | null;
          cancelled_by: string | null;
          cancel_reason: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          doc_number: string;
          doc_date: string;
          supplier_code: string;
          supplier_id?: string | null;
          inv_number?: string | null;
          inv_date?: string | null;
          total_amount: number;
          due_days?: number;
          due_date?: string | null;
          remark?: string | null;
          dr_amount?: number;
          cr_amount?: number;
          total_wht?: number;
          vat_type?: string;
          status?: string;
          receive_voucher?: string | null;
          vat_number?: string | null;
          po_number?: string | null;
          ap_type_code?: string | null;
          wht_code?: string | null;
          total_no_vat?: number;
          total_vat?: number;
          balance?: number;
          period_month?: string | null;
          period_year?: string | null;
          paid_amount?: number;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          cancel_reason?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          doc_number?: string;
          doc_date?: string;
          supplier_code?: string;
          supplier_id?: string | null;
          inv_number?: string | null;
          inv_date?: string | null;
          total_amount?: number;
          due_days?: number;
          due_date?: string | null;
          remark?: string | null;
          dr_amount?: number;
          cr_amount?: number;
          total_wht?: number;
          vat_type?: string;
          status?: string;
          receive_voucher?: string | null;
          vat_number?: string | null;
          po_number?: string | null;
          ap_type_code?: string | null;
          wht_code?: string | null;
          total_no_vat?: number;
          total_vat?: number;
          balance?: number;
          period_month?: string | null;
          period_year?: string | null;
          paid_amount?: number;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          cancel_reason?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "invoices_supplier_code_fkey"; columns: ["supplier_code"]; referencedRelation: "vendors"; referencedColumns: ["code"] },
          { foreignKeyName: "invoices_supplier_id_fkey"; columns: ["supplier_id"]; referencedRelation: "vendors"; referencedColumns: ["id"] },
        ];
      };
      invoice_items: {
        Row: {
          id: string;
          invoice_id: string;
          line_no: number;
          gl_account: string;
          description: string | null;
          dr_amount: number;
          cr_amount: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          line_no: number;
          gl_account: string;
          description?: string | null;
          dr_amount?: number;
          cr_amount?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          invoice_id?: string;
          line_no?: number;
          gl_account?: string;
          description?: string | null;
          dr_amount?: number;
          cr_amount?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "invoice_items_invoice_id_fkey"; columns: ["invoice_id"]; referencedRelation: "invoices"; referencedColumns: ["id"] },
        ];
      };
      payments: {
        Row: {
          id: string;
          doc_number: string;
          doc_date: string;
          supplier_code: string;
          supplier_id: string | null;
          pay_method: string;
          pay_code: string | null;
          bank_code: string | null;
          bank_name: string | null;
          cheque_number: string | null;
          cheque_date: string | null;
          remark: string | null;
          currency: string;
          total_amount: number;
          total_wht: number;
          total_vat: number;
          total_net: number;
          deposit_amount: number;
          deposit_vat: number;
          status: string;
          period_year: string | null;
          period_month: string | null;
          paid_at: string | null;
          paid_by: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          cancel_reason: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          doc_number: string;
          doc_date: string;
          supplier_code: string;
          supplier_id?: string | null;
          pay_method: string;
          pay_code?: string | null;
          bank_code?: string | null;
          bank_name?: string | null;
          cheque_number?: string | null;
          cheque_date?: string | null;
          remark?: string | null;
          currency?: string;
          total_amount: number;
          total_wht?: number;
          total_vat?: number;
          total_net?: number;
          deposit_amount?: number;
          deposit_vat?: number;
          status?: string;
          period_year?: string | null;
          period_month?: string | null;
          paid_at?: string | null;
          paid_by?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          cancel_reason?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          doc_number?: string;
          doc_date?: string;
          supplier_code?: string;
          supplier_id?: string | null;
          pay_method?: string;
          pay_code?: string | null;
          bank_code?: string | null;
          bank_name?: string | null;
          cheque_number?: string | null;
          cheque_date?: string | null;
          remark?: string | null;
          currency?: string;
          total_amount?: number;
          total_wht?: number;
          total_vat?: number;
          total_net?: number;
          deposit_amount?: number;
          deposit_vat?: number;
          status?: string;
          period_year?: string | null;
          period_month?: string | null;
          paid_at?: string | null;
          paid_by?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          cancel_reason?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "payments_supplier_code_fkey"; columns: ["supplier_code"]; referencedRelation: "vendors"; referencedColumns: ["code"] },
          { foreignKeyName: "payments_supplier_id_fkey"; columns: ["supplier_id"]; referencedRelation: "vendors"; referencedColumns: ["id"] },
        ];
      };
      payment_items: {
        Row: {
          id: string;
          payment_id: string;
          line_no: number;
          gl_account: string | null;
          description: string | null;
          dr_amount: number;
          cr_amount: number;
        };
        Insert: {
          id?: string;
          payment_id: string;
          line_no: number;
          gl_account?: string | null;
          description?: string | null;
          dr_amount?: number;
          cr_amount?: number;
        };
        Update: {
          id?: string;
          payment_id?: string;
          line_no?: number;
          gl_account?: string | null;
          description?: string | null;
          dr_amount?: number;
          cr_amount?: number;
        };
        Relationships: [
          { foreignKeyName: "payment_items_payment_id_fkey"; columns: ["payment_id"]; referencedRelation: "payments"; referencedColumns: ["id"] },
        ];
      };
      payment_invoices: {
        Row: {
          id: string;
          payment_id: string;
          invoice_id: string;
          voucher_number: string | null;
          amount_paid: number;
          wht_amount: number;
        };
        Insert: {
          id?: string;
          payment_id: string;
          invoice_id: string;
          voucher_number?: string | null;
          amount_paid?: number;
          wht_amount?: number;
        };
        Update: {
          id?: string;
          payment_id?: string;
          invoice_id?: string;
          voucher_number?: string | null;
          amount_paid?: number;
          wht_amount?: number;
        };
        Relationships: [
          { foreignKeyName: "payment_invoices_payment_id_fkey"; columns: ["payment_id"]; referencedRelation: "payments"; referencedColumns: ["id"] },
          { foreignKeyName: "payment_invoices_invoice_id_fkey"; columns: ["invoice_id"]; referencedRelation: "invoices"; referencedColumns: ["id"] },
        ];
      };
      deposit_payments: {
        Row: {
          id: string;
          doc_number: string;
          deposit_date: string;
          supplier_code: string;
          supplier_id: string | null;
          due_date: string | null;
          amount: number;
          vat_amount: number;
          vat_percent: number;
          po_number: string | null;
          remark: string | null;
          pay_code: string | null;
          paid_by: string | null;
          cheque_number: string | null;
          cheque_date: string | null;
          status: string;
          applied_amount: number;
          remaining_amount: number;
          cancelled_at: string | null;
          cancelled_by: string | null;
          cancel_reason: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          doc_number: string;
          deposit_date: string;
          supplier_code: string;
          supplier_id?: string | null;
          due_date?: string | null;
          amount: number;
          vat_amount?: number;
          vat_percent?: number;
          po_number?: string | null;
          remark?: string | null;
          pay_code?: string | null;
          paid_by?: string | null;
          cheque_number?: string | null;
          cheque_date?: string | null;
          status?: string;
          applied_amount?: number;
          remaining_amount?: number;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          cancel_reason?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          doc_number?: string;
          deposit_date?: string;
          supplier_code?: string;
          supplier_id?: string | null;
          due_date?: string | null;
          amount?: number;
          vat_amount?: number;
          vat_percent?: number;
          po_number?: string | null;
          remark?: string | null;
          pay_code?: string | null;
          paid_by?: string | null;
          cheque_number?: string | null;
          cheque_date?: string | null;
          status?: string;
          applied_amount?: number;
          remaining_amount?: number;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          cancel_reason?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "deposit_payments_supplier_code_fkey"; columns: ["supplier_code"]; referencedRelation: "vendors"; referencedColumns: ["code"] },
        ];
      };
      deposit_payment_items: {
        Row: {
          id: string;
          deposit_id: string;
          line_no: number;
          gl_account: string;
          description: string | null;
          dr_amount: number;
          cr_amount: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          deposit_id: string;
          line_no: number;
          gl_account: string;
          description?: string | null;
          dr_amount?: number;
          cr_amount?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          deposit_id?: string;
          line_no?: number;
          gl_account?: string;
          description?: string | null;
          dr_amount?: number;
          cr_amount?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "deposit_payment_items_deposit_id_fkey"; columns: ["deposit_id"]; referencedRelation: "deposit_payments"; referencedColumns: ["id"] },
        ];
      };
      deposit_applications: {
        Row: {
          id: string;
          deposit_id: string;
          invoice_id: string;
          amount_applied: number;
          status: string;
          applied_at: string;
          applied_by: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          remark: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          deposit_id: string;
          invoice_id: string;
          amount_applied: number;
          status?: string;
          applied_at?: string;
          applied_by?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          remark?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          deposit_id?: string;
          invoice_id?: string;
          amount_applied?: number;
          status?: string;
          applied_at?: string;
          applied_by?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          remark?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "deposit_applications_deposit_id_fkey"; columns: ["deposit_id"]; referencedRelation: "deposit_payments"; referencedColumns: ["id"] },
          { foreignKeyName: "deposit_applications_invoice_id_fkey"; columns: ["invoice_id"]; referencedRelation: "invoices"; referencedColumns: ["id"] },
        ];
      };
      transfers: {
        Row: {
          id: string;
          doc_number: string;
          transfer_date: string;
          from_vendor_id: string;
          from_vendor_code: string;
          to_vendor_id: string;
          to_vendor_code: string;
          amount: number;
          remark: string | null;
          status: string;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          doc_number: string;
          transfer_date: string;
          from_vendor_id: string;
          from_vendor_code: string;
          to_vendor_id: string;
          to_vendor_code: string;
          amount: number;
          remark?: string | null;
          status?: string;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          doc_number?: string;
          transfer_date?: string;
          from_vendor_id?: string;
          from_vendor_code?: string;
          to_vendor_id?: string;
          to_vendor_code?: string;
          amount?: number;
          remark?: string | null;
          status?: string;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "transfers_from_vendor_id_fkey"; columns: ["from_vendor_id"]; referencedRelation: "vendors"; referencedColumns: ["id"] },
          { foreignKeyName: "transfers_to_vendor_id_fkey"; columns: ["to_vendor_id"]; referencedRelation: "vendors"; referencedColumns: ["id"] },
        ];
      };
      bank_reconciliations: {
        Row: {
          id: string;
          bank_code: string;
          bank_name: string | null;
          statement_date: string | null;
          book_balance: number;
          is_reconciled: boolean;
          cheque_date: string | null;
          cheque_number: string | null;
          remark: string | null;
          received_date: string | null;
          amount: number | null;
          supplier_code: string | null;
          status: string | null;
          cancelled: boolean;
          cancelled_at: string | null;
          cancelled_by: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          bank_code: string;
          bank_name?: string | null;
          statement_date?: string | null;
          book_balance: number;
          is_reconciled?: boolean;
          cheque_date?: string | null;
          cheque_number?: string | null;
          remark?: string | null;
          received_date?: string | null;
          amount?: number | null;
          supplier_code?: string | null;
          status?: string | null;
          cancelled?: boolean;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          bank_code?: string;
          bank_name?: string | null;
          statement_date?: string | null;
          book_balance?: number;
          is_reconciled?: boolean;
          cheque_date?: string | null;
          cheque_number?: string | null;
          remark?: string | null;
          received_date?: string | null;
          amount?: number | null;
          supplier_code?: string | null;
          status?: string | null;
          cancelled?: boolean;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cheque_transactions: {
        Row: {
          id: string;
          payment_id: string | null;
          bank_code: string;
          bank_name: string | null;
          cheque_number: string;
          cheque_date: string;
          remark: string | null;
          cancelled: boolean;
          cancelled_at: string | null;
          cancelled_by: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          payment_id?: string | null;
          bank_code: string;
          bank_name?: string | null;
          cheque_number: string;
          cheque_date: string;
          remark?: string | null;
          cancelled?: boolean;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          payment_id?: string | null;
          bank_code?: string;
          bank_name?: string | null;
          cheque_number?: string;
          cheque_date?: string;
          remark?: string | null;
          cancelled?: boolean;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      withholding_taxes: {
        Row: {
          id: string;
          payment_id: string;
          wht_code: string;
          wht_type: string | null;
          wht_rate: number;
          wht_amount: number;
          wht_base: number;
          vendor_code: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          payment_id: string;
          wht_code: string;
          wht_type?: string | null;
          wht_rate: number;
          wht_amount: number;
          wht_base: number;
          vendor_code?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          payment_id?: string;
          wht_code?: string;
          wht_type?: string | null;
          wht_rate?: number;
          wht_amount?: number;
          wht_base?: number;
          vendor_code?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "withholding_taxes_payment_id_fkey"; columns: ["payment_id"]; referencedRelation: "payments"; referencedColumns: ["id"] },
        ];
      };
      bank_accounts: {
        Row: {
          id: string;
          code: string;
          name: string;
          account_no: string | null;
          bank_name: string | null;
          branch: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          account_no?: string | null;
          bank_name?: string | null;
          branch?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          account_no?: string | null;
          bank_name?: string | null;
          branch?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      gl_accounts: {
        Row: {
          id: string;
          code: string;
          name: string;
          name_th: string | null;
          account_type: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          name_th?: string | null;
          account_type?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          name_th?: string | null;
          account_type?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      periods: {
        Row: {
          id: string;
          period_year: string;
          period_month: string;
          date_from: string;
          date_to: string;
          closed: boolean;
          closed_at: string | null;
          closed_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          period_year: string;
          period_month: string;
          date_from: string;
          date_to: string;
          closed?: boolean;
          closed_at?: string | null;
          closed_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          period_year?: string;
          period_month?: string;
          date_from?: string;
          date_to?: string;
          closed?: boolean;
          closed_at?: string | null;
          closed_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      vendor_monthly_balances: {
        Row: {
          id: string;
          vendor_id: string;
          period_year: string;
          period_month: string;
          open_amount: number;
          open_dr: number;
          open_apply: number;
          open_paid: number;
          open_balance: number;
          inv_amount: number;
          dr_amount: number;
          apply_amount: number;
          paid_amount: number;
          balance: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          period_year: string;
          period_month: string;
          open_amount?: number;
          open_dr?: number;
          open_apply?: number;
          open_paid?: number;
          open_balance?: number;
          inv_amount?: number;
          dr_amount?: number;
          apply_amount?: number;
          paid_amount?: number;
          balance?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          vendor_id?: string;
          period_year?: string;
          period_month?: string;
          open_amount?: number;
          open_dr?: number;
          open_apply?: number;
          open_paid?: number;
          open_balance?: number;
          inv_amount?: number;
          dr_amount?: number;
          apply_amount?: number;
          paid_amount?: number;
          balance?: number;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "vendor_monthly_balances_vendor_id_fkey"; columns: ["vendor_id"]; referencedRelation: "vendors"; referencedColumns: ["id"] },
        ];
      };
      journal_entries: {
        Row: {
          id: string;
          doc_number: string;
          source_type: string;
          source_id: string;
          doc_date: string;
          period_year: string;
          period_month: string;
          description: string;
          total_debit: number;
          total_credit: number;
          is_posted: boolean;
          cancelled: boolean;
          posted_at: string | null;
          posted_by: string | null;
          cancelled_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          doc_number: string;
          source_type: string;
          source_id: string;
          doc_date: string;
          period_year: string;
          period_month: string;
          description: string;
          total_debit: number;
          total_credit: number;
          is_posted?: boolean;
          cancelled?: boolean;
          posted_at?: string | null;
          posted_by?: string | null;
          cancelled_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          doc_number?: string;
          source_type?: string;
          source_id?: string;
          doc_date?: string;
          period_year?: string;
          period_month?: string;
          description?: string;
          total_debit?: number;
          total_credit?: number;
          is_posted?: boolean;
          cancelled?: boolean;
          posted_at?: string | null;
          posted_by?: string | null;
          cancelled_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      journal_entry_lines: {
        Row: {
          id: string;
          journal_entry_id: string;
          line_no: number;
          gl_account: string;
          description: string | null;
          debit: number;
          credit: number;
        };
        Insert: {
          id?: string;
          journal_entry_id: string;
          line_no: number;
          gl_account: string;
          description?: string | null;
          debit?: number;
          credit?: number;
        };
        Update: {
          id?: string;
          journal_entry_id?: string;
          line_no?: number;
          gl_account?: string;
          description?: string | null;
          debit?: number;
          credit?: number;
        };
        Relationships: [
          { foreignKeyName: "journal_entry_lines_journal_entry_id_fkey"; columns: ["journal_entry_id"]; referencedRelation: "journal_entries"; referencedColumns: ["id"] },
        ];
      };
      config: {
        Row: {
          id: string;
          company_code: string;
          company_name: string | null;
          company_name_th: string | null;
          address: string | null;
          phone: string | null;
          tax_id: string | null;
          gl_trade_control: string | null;
          dp_auto: boolean;
          dp_format1: string | null;
          dp_format2: string | null;
          dp_fix_for: string | null;
          dp_for_len: number;
          chk_vc_dup: boolean;
          chk_inv_dup: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_code: string;
          company_name?: string | null;
          company_name_th?: string | null;
          address?: string | null;
          phone?: string | null;
          tax_id?: string | null;
          gl_trade_control?: string | null;
          dp_auto?: boolean;
          dp_format1?: string | null;
          dp_format2?: string | null;
          dp_fix_for?: string | null;
          dp_for_len?: number;
          chk_vc_dup?: boolean;
          chk_inv_dup?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_code?: string;
          company_name?: string | null;
          company_name_th?: string | null;
          address?: string | null;
          phone?: string | null;
          tax_id?: string | null;
          gl_trade_control?: string | null;
          dp_auto?: boolean;
          dp_format1?: string | null;
          dp_format2?: string | null;
          dp_fix_for?: string | null;
          dp_for_len?: number;
          chk_vc_dup?: boolean;
          chk_inv_dup?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ap_types: {
        Row: {
          id: string;
          code: string;
          name: string;
          name_th: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          name_th?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          name_th?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      vat_codes: {
        Row: {
          id: string;
          code: string;
          name: string;
          rate: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          rate: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          rate?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      wht_codes: {
        Row: {
          id: string;
          code: string;
          name: string;
          rate: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          rate: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          rate?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      payment_codes: {
        Row: {
          id: string;
          code: string;
          name: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      approvals: {
        Row: {
          id: string;
          entity_type: string;
          entity_id: string;
          approver_id: string;
          status: string;
          comment: string | null;
          decided_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          entity_type: string;
          entity_id: string;
          approver_id: string;
          status?: string;
          comment?: string | null;
          decided_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          entity_type?: string;
          entity_id?: string;
          approver_id?: string;
          status?: string;
          comment?: string | null;
          decided_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      approval_policies: {
        Row: {
          id: string;
          module_code: string;
          min_amount: number;
          max_amount: number | null;
          required_approvers: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          module_code: string;
          min_amount: number;
          max_amount?: number | null;
          required_approvers?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          module_code?: string;
          min_amount?: number;
          max_amount?: number | null;
          required_approvers?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          table_name: string;
          record_id: string;
          action: string;
          old_data: Json | null;
          new_data: Json | null;
          changed_by: string | null;
          changed_at: string;
          detail: string | null;
          ip_address: string | null;
        };
        Insert: {
          id?: string;
          table_name: string;
          record_id: string;
          action: string;
          old_data?: Json | null;
          new_data?: Json | null;
          changed_by?: string | null;
          changed_at?: string;
          detail?: string | null;
          ip_address?: string | null;
        };
        Update: {
          id?: string;
          table_name?: string;
          record_id?: string;
          action?: string;
          old_data?: Json | null;
          new_data?: Json | null;
          changed_by?: string | null;
          changed_at?: string;
          detail?: string | null;
          ip_address?: string | null;
        };
        Relationships: [];
      };
      invoice_attachments: {
        Row: {
          id: string;
          invoice_id: string;
          file_name: string;
          file_path: string;
          file_size: number;
          mime_type: string;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          file_name: string;
          file_path: string;
          file_size: number;
          mime_type: string;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          invoice_id?: string;
          file_name?: string;
          file_path?: string;
          file_size?: number;
          mime_type?: string;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "invoice_attachments_invoice_id_fkey"; columns: ["invoice_id"]; referencedRelation: "invoices"; referencedColumns: ["id"] },
        ];
      };
      wht_per_supplier: {
        Row: {
          id: string;
          vendor_id: string;
          wht_code: string;
          wht_type: string | null;
          wht_rate: number;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          wht_code: string;
          wht_type?: string | null;
          wht_rate: number;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          vendor_id?: string;
          wht_code?: string;
          wht_type?: string | null;
          wht_rate?: number;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "wht_per_supplier_vendor_id_fkey"; columns: ["vendor_id"]; referencedRelation: "vendors"; referencedColumns: ["id"] },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      has_role: {
        Args: { role_code: string };
        Returns: boolean;
      };
      has_right: {
        Args: { right_code: string };
        Returns: boolean;
      };
      can_create: {
        Args: { module_code: string };
        Returns: boolean;
      };
      can_read: {
        Args: { module_code: string };
        Returns: boolean;
      };
      can_update: {
        Args: { module_code: string };
        Returns: boolean;
      };
      can_delete: {
        Args: { module_code: string };
        Returns: boolean;
      };
      can_approve: {
        Args: { module_code: string };
        Returns: boolean;
      };
      next_doc_number: {
        Args: {
          p_table: string;
          p_field: string;
          p_prefix?: string;
          p_digits?: number;
          p_group?: string;
        };
        Returns: string;
      };
      recalculate_vendor_balance: {
        Args: { p_vendor_code?: string; p_vendor_id?: string };
        Returns: void;
      };
      validate_period_can_close: {
        Args: { p_year: string; p_month: string };
        Returns: string;
      };
      mark_cheque_cleared: {
        Args: { p_cheque_id: string };
        Returns: void;
      };
    };
    Enums: {
      app_currency: "THB" | "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "SGD" | "MYR";
      invoice_status: "draft" | "pending_approval" | "approved" | "rejected" | "posted" | "cancelled" | "voided";
      payment_status: "draft" | "pending_approval" | "approved" | "rejected" | "paid" | "cancelled" | "voided";
      approval_status: "pending" | "approved" | "rejected" | "returned";
      payment_method: "cash" | "cheque" | "bank_transfer" | "credit_card" | "offset" | "deposit";
      approval_action: "submit" | "approve" | "reject" | "return" | "cancel";
      entity_type: "invoice" | "payment" | "deposit" | "bank_reconciliation";
      wht_card_type: "person" | "company" | "government" | "non_profit" | "foreign";
      vat_type: "inclusive" | "exclusive" | "exempt" | "none";
      audit_action: "create" | "update" | "delete" | "approve" | "reject" | "post" | "cancel" | "void" | "print" | "export";
    };
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];
