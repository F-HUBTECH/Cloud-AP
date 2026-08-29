export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ap_types: {
        Row: {
          code: string
          id: string
          name: string
        }
        Insert: {
          code: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      app_users: {
        Row: {
          auth_uid: string | null
          created_at: string
          department: string | null
          display_name: string
          email: string | null
          employee_id: string | null
          id: string
          is_active: boolean
          language: string
          last_login_at: string | null
          login_name: string
          phone: string | null
          position: string | null
          updated_at: string
        }
        Insert: {
          auth_uid?: string | null
          created_at?: string
          department?: string | null
          display_name: string
          email?: string | null
          employee_id?: string | null
          id?: string
          is_active?: boolean
          language?: string
          last_login_at?: string | null
          login_name: string
          phone?: string | null
          position?: string | null
          updated_at?: string
        }
        Update: {
          auth_uid?: string | null
          created_at?: string
          department?: string | null
          display_name?: string
          email?: string | null
          employee_id?: string | null
          id?: string
          is_active?: boolean
          language?: string
          last_login_at?: string | null
          login_name?: string
          phone?: string | null
          position?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      approval_policies: {
        Row: {
          created_at: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id: string
          is_active: boolean
          level_no: number
          max_amount: number | null
          min_amount: number | null
          role_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id?: string
          is_active?: boolean
          level_no?: number
          max_amount?: number | null
          min_amount?: number | null
          role_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_type?: Database["public"]["Enums"]["entity_type"]
          id?: string
          is_active?: boolean
          level_no?: number
          max_amount?: number | null
          min_amount?: number | null
          role_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_policies_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      approvals: {
        Row: {
          action: Database["public"]["Enums"]["approval_action"]
          approved_at: string | null
          approved_by: string | null
          comment: string | null
          created_at: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id: string
          level_no: number
          requested_at: string
          requested_by: string | null
          status: Database["public"]["Enums"]["approval_status"]
        }
        Insert: {
          action: Database["public"]["Enums"]["approval_action"]
          approved_at?: string | null
          approved_by?: string | null
          comment?: string | null
          created_at?: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id?: string
          level_no?: number
          requested_at?: string
          requested_by?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
        }
        Update: {
          action?: Database["public"]["Enums"]["approval_action"]
          approved_at?: string | null
          approved_by?: string | null
          comment?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["entity_type"]
          id?: string
          level_no?: number
          requested_at?: string
          requested_by?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
        }
        Relationships: [
          {
            foreignKeyName: "approvals_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          detail: string | null
          id: string
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          performed_at: string
          performed_by: string | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          detail?: string | null
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          performed_at?: string
          performed_by?: string | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          detail?: string | null
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          performed_at?: string
          performed_by?: string | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_no: string | null
          branch: string | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          account_no?: string | null
          branch?: string | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          account_no?: string | null
          branch?: string | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      bank_reconciliations: {
        Row: {
          amount: number | null
          bank_code: string | null
          cancel_reason: string | null
          cancelled: boolean | null
          cancelled_at: string | null
          cancelled_by: string | null
          cheque_date: string | null
          cheque_number: string | null
          created_at: string
          created_by: string | null
          id: string
          received_date: string | null
          remark: string | null
          status: string | null
          supplier_code: string | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          bank_code?: string | null
          cancel_reason?: string | null
          cancelled?: boolean | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cheque_date?: string | null
          cheque_number?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          received_date?: string | null
          remark?: string | null
          status?: string | null
          supplier_code?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          bank_code?: string | null
          cancel_reason?: string | null
          cancelled?: boolean | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cheque_date?: string | null
          cheque_number?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          received_date?: string | null
          remark?: string | null
          status?: string | null
          supplier_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_reconciliations_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_reconciliations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_reconciliations_supplier_code_fkey"
            columns: ["supplier_code"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["code"]
          },
        ]
      }
      cheque_transactions: {
        Row: {
          bank_code: string | null
          bank_name: string | null
          cancel_reason: string | null
          cancelled: boolean | null
          cancelled_at: string | null
          cancelled_by: string | null
          cheque_date: string | null
          cheque_number: string
          created_at: string
          created_by: string | null
          id: string
          payment_id: string | null
          remark: string | null
          updated_at: string
        }
        Insert: {
          bank_code?: string | null
          bank_name?: string | null
          cancel_reason?: string | null
          cancelled?: boolean | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cheque_date?: string | null
          cheque_number: string
          created_at?: string
          created_by?: string | null
          id?: string
          payment_id?: string | null
          remark?: string | null
          updated_at?: string
        }
        Update: {
          bank_code?: string | null
          bank_name?: string | null
          cancel_reason?: string | null
          cancelled?: boolean | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cheque_date?: string | null
          cheque_number?: string
          created_at?: string
          created_by?: string | null
          id?: string
          payment_id?: string | null
          remark?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cheque_transactions_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cheque_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cheque_transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      config: {
        Row: {
          acc_add: string | null
          acc_deposit: string | null
          acc_po: string | null
          acc_trade: string | null
          address_line1: string | null
          address_line2: string | null
          address_line3: string | null
          auto_doc_no: boolean
          chk_ac_date: boolean | null
          chk_ac_tax: boolean | null
          chk_ac_trade: boolean | null
          chk_cheque_no: boolean | null
          chk_gl_mn: boolean | null
          chk_inv_dup: boolean | null
          chk_inv_empty: boolean | null
          chk_send_gl: boolean | null
          chk_upd_over: boolean | null
          chk_vc_dup: boolean | null
          chk_vc_empty: boolean | null
          city: string | null
          company_code: string
          company_name_en: string | null
          company_name_th: string | null
          connect_gl: string | null
          contact_person: string | null
          country: string | null
          created_at: string
          currency: Database["public"]["Enums"]["app_currency"]
          default_lang: string | null
          disp_format: string | null
          dp_auto: number | null
          dp_fix_for: number | null
          dp_for_len: number | null
          dp_format1: string | null
          dp_format2: string | null
          dr_auto: number | null
          dr_fix_for: number | null
          dr_for_len: number | null
          dr_format1: string | null
          dr_format2: string | null
          edit_format: string | null
          email: string | null
          fax: string | null
          gen_wht: boolean | null
          id: string
          import_inv: boolean | null
          pd_auto: number | null
          pd_fix_for: number | null
          pd_for_len: number | null
          pd_format1: string | null
          pd_format2: string | null
          period_month: string | null
          period_year: string | null
          phone: string | null
          print_payment: boolean | null
          print_voucher: boolean | null
          prn_wht: boolean | null
          reg_no: string | null
          tax_assign_inv: boolean | null
          tax_id: string | null
          updated_at: string
          vat_percent: number
          vc_auto: number | null
          vc_fix_for: number | null
          vc_for_len: number | null
          vc_format1: string | null
          vc_format2: string | null
          wht_percent: number
          zip_code: string | null
        }
        Insert: {
          acc_add?: string | null
          acc_deposit?: string | null
          acc_po?: string | null
          acc_trade?: string | null
          address_line1?: string | null
          address_line2?: string | null
          address_line3?: string | null
          auto_doc_no?: boolean
          chk_ac_date?: boolean | null
          chk_ac_tax?: boolean | null
          chk_ac_trade?: boolean | null
          chk_cheque_no?: boolean | null
          chk_gl_mn?: boolean | null
          chk_inv_dup?: boolean | null
          chk_inv_empty?: boolean | null
          chk_send_gl?: boolean | null
          chk_upd_over?: boolean | null
          chk_vc_dup?: boolean | null
          chk_vc_empty?: boolean | null
          city?: string | null
          company_code: string
          company_name_en?: string | null
          company_name_th?: string | null
          connect_gl?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["app_currency"]
          default_lang?: string | null
          disp_format?: string | null
          dp_auto?: number | null
          dp_fix_for?: number | null
          dp_for_len?: number | null
          dp_format1?: string | null
          dp_format2?: string | null
          dr_auto?: number | null
          dr_fix_for?: number | null
          dr_for_len?: number | null
          dr_format1?: string | null
          dr_format2?: string | null
          edit_format?: string | null
          email?: string | null
          fax?: string | null
          gen_wht?: boolean | null
          id?: string
          import_inv?: boolean | null
          pd_auto?: number | null
          pd_fix_for?: number | null
          pd_for_len?: number | null
          pd_format1?: string | null
          pd_format2?: string | null
          period_month?: string | null
          period_year?: string | null
          phone?: string | null
          print_payment?: boolean | null
          print_voucher?: boolean | null
          prn_wht?: boolean | null
          reg_no?: string | null
          tax_assign_inv?: boolean | null
          tax_id?: string | null
          updated_at?: string
          vat_percent?: number
          vc_auto?: number | null
          vc_fix_for?: number | null
          vc_for_len?: number | null
          vc_format1?: string | null
          vc_format2?: string | null
          wht_percent?: number
          zip_code?: string | null
        }
        Update: {
          acc_add?: string | null
          acc_deposit?: string | null
          acc_po?: string | null
          acc_trade?: string | null
          address_line1?: string | null
          address_line2?: string | null
          address_line3?: string | null
          auto_doc_no?: boolean
          chk_ac_date?: boolean | null
          chk_ac_tax?: boolean | null
          chk_ac_trade?: boolean | null
          chk_cheque_no?: boolean | null
          chk_gl_mn?: boolean | null
          chk_inv_dup?: boolean | null
          chk_inv_empty?: boolean | null
          chk_send_gl?: boolean | null
          chk_upd_over?: boolean | null
          chk_vc_dup?: boolean | null
          chk_vc_empty?: boolean | null
          city?: string | null
          company_code?: string
          company_name_en?: string | null
          company_name_th?: string | null
          connect_gl?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["app_currency"]
          default_lang?: string | null
          disp_format?: string | null
          dp_auto?: number | null
          dp_fix_for?: number | null
          dp_for_len?: number | null
          dp_format1?: string | null
          dp_format2?: string | null
          dr_auto?: number | null
          dr_fix_for?: number | null
          dr_for_len?: number | null
          dr_format1?: string | null
          dr_format2?: string | null
          edit_format?: string | null
          email?: string | null
          fax?: string | null
          gen_wht?: boolean | null
          id?: string
          import_inv?: boolean | null
          pd_auto?: number | null
          pd_fix_for?: number | null
          pd_for_len?: number | null
          pd_format1?: string | null
          pd_format2?: string | null
          period_month?: string | null
          period_year?: string | null
          phone?: string | null
          print_payment?: boolean | null
          print_voucher?: boolean | null
          prn_wht?: boolean | null
          reg_no?: string | null
          tax_assign_inv?: boolean | null
          tax_id?: string | null
          updated_at?: string
          vat_percent?: number
          vc_auto?: number | null
          vc_fix_for?: number | null
          vc_for_len?: number | null
          vc_format1?: string | null
          vc_format2?: string | null
          wht_percent?: number
          zip_code?: string | null
        }
        Relationships: []
      }
      deposit_applications: {
        Row: {
          amount_applied: number
          applied_at: string
          applied_by: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          deposit_id: string
          id: string
          invoice_id: string
          status: string | null
          updated_at: string
          vat_applied: number | null
        }
        Insert: {
          amount_applied?: number
          applied_at?: string
          applied_by?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          deposit_id: string
          id?: string
          invoice_id: string
          status?: string | null
          updated_at?: string
          vat_applied?: number | null
        }
        Update: {
          amount_applied?: number
          applied_at?: string
          applied_by?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          deposit_id?: string
          id?: string
          invoice_id?: string
          status?: string | null
          updated_at?: string
          vat_applied?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deposit_applications_applied_by_fkey"
            columns: ["applied_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_applications_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_applications_deposit_id_fkey"
            columns: ["deposit_id"]
            isOneToOne: false
            referencedRelation: "deposit_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_applications_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      deposit_payment_items: {
        Row: {
          cr_amount: number | null
          created_at: string
          deposit_id: string
          description: string | null
          dr_amount: number | null
          gl_account: string | null
          id: string
          line_no: number
          updated_at: string
        }
        Insert: {
          cr_amount?: number | null
          created_at?: string
          deposit_id: string
          description?: string | null
          dr_amount?: number | null
          gl_account?: string | null
          id?: string
          line_no: number
          updated_at?: string
        }
        Update: {
          cr_amount?: number | null
          created_at?: string
          deposit_id?: string
          description?: string | null
          dr_amount?: number | null
          gl_account?: string | null
          id?: string
          line_no?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposit_payment_items_deposit_id_fkey"
            columns: ["deposit_id"]
            isOneToOne: false
            referencedRelation: "deposit_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      deposit_payments: {
        Row: {
          amount: number | null
          applied_amount: number | null
          cheque_date: string | null
          cheque_number: string | null
          created_at: string
          created_by: string | null
          deposit_date: string
          doc_number: string
          due_date: string | null
          id: string
          paid_by: string | null
          pay_code: string | null
          po_number: string | null
          remaining_amount: number | null
          remark: string | null
          status: string | null
          supplier_code: string
          supplier_id: string
          updated_at: string
          vat_amount: number | null
          vat_percent: number | null
        }
        Insert: {
          amount?: number | null
          applied_amount?: number | null
          cheque_date?: string | null
          cheque_number?: string | null
          created_at?: string
          created_by?: string | null
          deposit_date: string
          doc_number: string
          due_date?: string | null
          id?: string
          paid_by?: string | null
          pay_code?: string | null
          po_number?: string | null
          remaining_amount?: number | null
          remark?: string | null
          status?: string | null
          supplier_code: string
          supplier_id: string
          updated_at?: string
          vat_amount?: number | null
          vat_percent?: number | null
        }
        Update: {
          amount?: number | null
          applied_amount?: number | null
          cheque_date?: string | null
          cheque_number?: string | null
          created_at?: string
          created_by?: string | null
          deposit_date?: string
          doc_number?: string
          due_date?: string | null
          id?: string
          paid_by?: string | null
          pay_code?: string | null
          po_number?: string | null
          remaining_amount?: number | null
          remark?: string | null
          status?: string | null
          supplier_code?: string
          supplier_id?: string
          updated_at?: string
          vat_amount?: number | null
          vat_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deposit_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_payments_supplier_code_fkey"
            columns: ["supplier_code"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "deposit_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_number_sequences: {
        Row: {
          created_at: string
          field_name: string
          group_key: string
          id: string
          last_value: number
          table_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          field_name: string
          group_key?: string
          id?: string
          last_value?: number
          table_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          field_name?: string
          group_key?: string
          id?: string
          last_value?: number
          table_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      gl_accounts: {
        Row: {
          account_type: string | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          level_no: number | null
          name: string
          parent_code: string | null
          updated_at: string
        }
        Insert: {
          account_type?: string | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          level_no?: number | null
          name: string
          parent_code?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: string | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          level_no?: number | null
          name?: string
          parent_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      i18n_messages: {
        Row: {
          field_key: string
          id: string
          lang: string
          message: string | null
          table_key: string
        }
        Insert: {
          field_key: string
          id?: string
          lang: string
          message?: string | null
          table_key: string
        }
        Update: {
          field_key?: string
          id?: string
          lang?: string
          message?: string | null
          table_key?: string
        }
        Relationships: []
      }
      invoice_attachments: {
        Row: {
          content_type: string | null
          created_at: string
          file_name: string
          file_size: number | null
          id: string
          invoice_id: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          file_name: string
          file_size?: number | null
          id?: string
          invoice_id: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          content_type?: string | null
          created_at?: string
          file_name?: string
          file_size?: number | null
          id?: string
          invoice_id?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_attachments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          cr_amount: number | null
          created_at: string
          description: string | null
          dr_amount: number | null
          gl_account: string | null
          group_code: string | null
          group_store: string | null
          id: string
          inv_type: string | null
          invoice_id: string
          line_no: number
          store_code: string | null
          total_no_vat: number | null
          updated_at: string
        }
        Insert: {
          cr_amount?: number | null
          created_at?: string
          description?: string | null
          dr_amount?: number | null
          gl_account?: string | null
          group_code?: string | null
          group_store?: string | null
          id?: string
          inv_type?: string | null
          invoice_id: string
          line_no: number
          store_code?: string | null
          total_no_vat?: number | null
          updated_at?: string
        }
        Update: {
          cr_amount?: number | null
          created_at?: string
          description?: string | null
          dr_amount?: number | null
          gl_account?: string | null
          group_code?: string | null
          group_store?: string | null
          id?: string
          inv_type?: string | null
          invoice_id?: string
          line_no?: number
          store_code?: string | null
          total_no_vat?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          ap_type_code: string | null
          balance: number | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cr_amount: number | null
          created_at: string
          created_by: string | null
          currency: Database["public"]["Enums"]["app_currency"] | null
          deposit_amount: number | null
          deposit_vat: number | null
          doc_date: string
          doc_number: string
          dr_amount: number | null
          due_date: string | null
          due_days: number | null
          gl_jv_number: string | null
          id: string
          inv_date: string | null
          inv_number: string | null
          paid_amount: number | null
          period_month: string | null
          period_year: string | null
          po_number: string | null
          posted_at: string | null
          posted_by: string | null
          receive_voucher: string | null
          remark: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          supplier_code: string
          supplier_id: string
          total_amount: number | null
          total_no_vat: number | null
          total_vat: number | null
          total_wht: number | null
          updated_at: string
          updated_by: string | null
          vat_code: string | null
          vat_number: string | null
          vat_type: Database["public"]["Enums"]["vat_type"] | null
          wht_code: string | null
        }
        Insert: {
          ap_type_code?: string | null
          balance?: number | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cr_amount?: number | null
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["app_currency"] | null
          deposit_amount?: number | null
          deposit_vat?: number | null
          doc_date: string
          doc_number: string
          dr_amount?: number | null
          due_date?: string | null
          due_days?: number | null
          gl_jv_number?: string | null
          id?: string
          inv_date?: string | null
          inv_number?: string | null
          paid_amount?: number | null
          period_month?: string | null
          period_year?: string | null
          po_number?: string | null
          posted_at?: string | null
          posted_by?: string | null
          receive_voucher?: string | null
          remark?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          supplier_code: string
          supplier_id: string
          total_amount?: number | null
          total_no_vat?: number | null
          total_vat?: number | null
          total_wht?: number | null
          updated_at?: string
          updated_by?: string | null
          vat_code?: string | null
          vat_number?: string | null
          vat_type?: Database["public"]["Enums"]["vat_type"] | null
          wht_code?: string | null
        }
        Update: {
          ap_type_code?: string | null
          balance?: number | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cr_amount?: number | null
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["app_currency"] | null
          deposit_amount?: number | null
          deposit_vat?: number | null
          doc_date?: string
          doc_number?: string
          dr_amount?: number | null
          due_date?: string | null
          due_days?: number | null
          gl_jv_number?: string | null
          id?: string
          inv_date?: string | null
          inv_number?: string | null
          paid_amount?: number | null
          period_month?: string | null
          period_year?: string | null
          po_number?: string | null
          posted_at?: string | null
          posted_by?: string | null
          receive_voucher?: string | null
          remark?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          supplier_code?: string
          supplier_id?: string
          total_amount?: number | null
          total_no_vat?: number | null
          total_vat?: number | null
          total_wht?: number | null
          updated_at?: string
          updated_by?: string | null
          vat_code?: string | null
          vat_number?: string | null
          vat_type?: Database["public"]["Enums"]["vat_type"] | null
          wht_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_supplier_code_fkey"
            columns: ["supplier_code"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          cancelled: boolean
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string | null
          description: string | null
          doc_date: string
          doc_number: string
          id: string
          is_posted: boolean
          period_month: string
          period_year: string
          posted_at: string | null
          posted_by: string | null
          source_id: string
          source_type: string
          total_credit: number
          total_debit: number
          updated_at: string
        }
        Insert: {
          cancelled?: boolean
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          doc_date: string
          doc_number: string
          id?: string
          is_posted?: boolean
          period_month: string
          period_year: string
          posted_at?: string | null
          posted_by?: string | null
          source_id: string
          source_type: string
          total_credit?: number
          total_debit?: number
          updated_at?: string
        }
        Update: {
          cancelled?: boolean
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          doc_date?: string
          doc_number?: string
          id?: string
          is_posted?: boolean
          period_month?: string
          period_year?: string
          posted_at?: string | null
          posted_by?: string | null
          source_id?: string
          source_type?: string
          total_credit?: number
          total_debit?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entry_lines: {
        Row: {
          created_at: string
          credit: number
          debit: number
          description: string | null
          gl_account: string
          id: string
          journal_entry_id: string
          line_no: number
        }
        Insert: {
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          gl_account: string
          id?: string
          journal_entry_id: string
          line_no?: number
        }
        Update: {
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          gl_account?: string
          id?: string
          journal_entry_id?: string
          line_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      month_end: {
        Row: {
          apply_amount: number | null
          balance: number | null
          created_at: string
          dr_amount: number | null
          id: string
          inv_amount: number | null
          open_amount: number | null
          open_apply: number | null
          open_balance: number | null
          open_dr: number | null
          open_paid: number | null
          paid_amount: number | null
          period_month: string
          period_year: string
          supplier_code: string
          updated_at: string
        }
        Insert: {
          apply_amount?: number | null
          balance?: number | null
          created_at?: string
          dr_amount?: number | null
          id?: string
          inv_amount?: number | null
          open_amount?: number | null
          open_apply?: number | null
          open_balance?: number | null
          open_dr?: number | null
          open_paid?: number | null
          paid_amount?: number | null
          period_month: string
          period_year: string
          supplier_code: string
          updated_at?: string
        }
        Update: {
          apply_amount?: number | null
          balance?: number | null
          created_at?: string
          dr_amount?: number | null
          id?: string
          inv_amount?: number | null
          open_amount?: number | null
          open_apply?: number | null
          open_balance?: number | null
          open_dr?: number | null
          open_paid?: number | null
          paid_amount?: number | null
          period_month?: string
          period_year?: string
          supplier_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "month_end_supplier_code_fkey"
            columns: ["supplier_code"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["code"]
          },
        ]
      }
      payment_codes: {
        Row: {
          code: string
          description: string | null
          gl_account: string | null
          id: string
        }
        Insert: {
          code: string
          description?: string | null
          gl_account?: string | null
          id?: string
        }
        Update: {
          code?: string
          description?: string | null
          gl_account?: string | null
          id?: string
        }
        Relationships: []
      }
      payment_invoices: {
        Row: {
          amount_paid: number
          created_at: string
          id: string
          invoice_id: string
          payment_id: string
          updated_at: string
          voucher_number: string | null
          wht_amount: number | null
        }
        Insert: {
          amount_paid?: number
          created_at?: string
          id?: string
          invoice_id: string
          payment_id: string
          updated_at?: string
          voucher_number?: string | null
          wht_amount?: number | null
        }
        Update: {
          amount_paid?: number
          created_at?: string
          id?: string
          invoice_id?: string
          payment_id?: string
          updated_at?: string
          voucher_number?: string | null
          wht_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_invoices_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_invoices_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_items: {
        Row: {
          cr_amount: number | null
          created_at: string
          description: string | null
          dr_amount: number | null
          gl_account: string | null
          id: string
          line_no: number
          payment_id: string
          updated_at: string
        }
        Insert: {
          cr_amount?: number | null
          created_at?: string
          description?: string | null
          dr_amount?: number | null
          gl_account?: string | null
          id?: string
          line_no: number
          payment_id: string
          updated_at?: string
        }
        Update: {
          cr_amount?: number | null
          created_at?: string
          description?: string | null
          dr_amount?: number | null
          gl_account?: string | null
          id?: string
          line_no?: number
          payment_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_items_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          bank_code: string | null
          bank_name: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cheque_date: string | null
          cheque_number: string | null
          created_at: string
          created_by: string | null
          currency: Database["public"]["Enums"]["app_currency"] | null
          deposit_amount: number | null
          deposit_vat: number | null
          doc_date: string
          doc_number: string
          gl_jv_number: string | null
          id: string
          paid_at: string | null
          paid_by: string | null
          pay_code: string | null
          pay_method: Database["public"]["Enums"]["payment_method"]
          period_month: string | null
          period_year: string | null
          remark: string | null
          status: Database["public"]["Enums"]["payment_status"]
          supplier_code: string
          supplier_id: string
          total_amount: number | null
          total_net: number | null
          total_vat: number | null
          total_wht: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bank_code?: string | null
          bank_name?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cheque_date?: string | null
          cheque_number?: string | null
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["app_currency"] | null
          deposit_amount?: number | null
          deposit_vat?: number | null
          doc_date: string
          doc_number: string
          gl_jv_number?: string | null
          id?: string
          paid_at?: string | null
          paid_by?: string | null
          pay_code?: string | null
          pay_method?: Database["public"]["Enums"]["payment_method"]
          period_month?: string | null
          period_year?: string | null
          remark?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          supplier_code: string
          supplier_id: string
          total_amount?: number | null
          total_net?: number | null
          total_vat?: number | null
          total_wht?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bank_code?: string | null
          bank_name?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cheque_date?: string | null
          cheque_number?: string | null
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["app_currency"] | null
          deposit_amount?: number | null
          deposit_vat?: number | null
          doc_date?: string
          doc_number?: string
          gl_jv_number?: string | null
          id?: string
          paid_at?: string | null
          paid_by?: string | null
          pay_code?: string | null
          pay_method?: Database["public"]["Enums"]["payment_method"]
          period_month?: string | null
          period_year?: string | null
          remark?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          supplier_code?: string
          supplier_id?: string
          total_amount?: number | null
          total_net?: number | null
          total_vat?: number | null
          total_wht?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_supplier_code_fkey"
            columns: ["supplier_code"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      periods: {
        Row: {
          closed: boolean
          closed_at: string | null
          closed_by: string | null
          created_at: string
          date_from: string
          date_to: string
          id: string
          period_month: string
          period_year: string
        }
        Insert: {
          closed?: boolean
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          date_from: string
          date_to: string
          id?: string
          period_month: string
          period_year: string
        }
        Update: {
          closed?: boolean
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          date_from?: string
          date_to?: string
          id?: string
          period_month?: string
          period_year?: string
        }
        Relationships: [
          {
            foreignKeyName: "periods_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      report_groups: {
        Row: {
          code: string
          id: string
          name: string
          tr_type: string | null
        }
        Insert: {
          code: string
          id?: string
          name: string
          tr_type?: string | null
        }
        Update: {
          code?: string
          id?: string
          name?: string
          tr_type?: string | null
        }
        Relationships: []
      }
      report_permissions: {
        Row: {
          id: string
          report_id: string
          user_id: string
        }
        Insert: {
          id?: string
          report_id: string
          user_id: string
        }
        Update: {
          id?: string
          report_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_permissions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          code: string
          group_id: string
          id: string
          name: string
          remark: string | null
          report_file: string | null
          tr_type: string | null
        }
        Insert: {
          code: string
          group_id: string
          id?: string
          name: string
          remark?: string | null
          report_file?: string | null
          tr_type?: string | null
        }
        Update: {
          code?: string
          group_id?: string
          id?: string
          name?: string
          remark?: string | null
          report_file?: string | null
          tr_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "report_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      role_rights: {
        Row: {
          action: string
          id: string
          permitted: boolean
          resource: string
          role_id: string
        }
        Insert: {
          action: string
          id?: string
          permitted?: boolean
          resource: string
          role_id: string
        }
        Update: {
          action?: string
          id?: string
          permitted?: boolean
          resource?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_rights_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          name_th: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          name_th?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          name_th?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      transfers: {
        Row: {
          amount: number | null
          created_at: string
          created_by: string | null
          doc_number: string | null
          from_vendor_code: string | null
          from_vendor_id: string | null
          id: string
          period_month: string | null
          period_year: string | null
          remark: string | null
          status: string | null
          to_vendor_code: string | null
          to_vendor_id: string | null
          transfer_date: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          created_by?: string | null
          doc_number?: string | null
          from_vendor_code?: string | null
          from_vendor_id?: string | null
          id?: string
          period_month?: string | null
          period_year?: string | null
          remark?: string | null
          status?: string | null
          to_vendor_code?: string | null
          to_vendor_id?: string | null
          transfer_date: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          created_by?: string | null
          doc_number?: string | null
          from_vendor_code?: string | null
          from_vendor_id?: string | null
          id?: string
          period_month?: string | null
          period_year?: string | null
          remark?: string | null
          status?: string | null
          to_vendor_code?: string | null
          to_vendor_id?: string | null
          transfer_date?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transfers_from_vendor_code_fkey"
            columns: ["from_vendor_code"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "transfers_from_vendor_id_fkey"
            columns: ["from_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_to_vendor_code_fkey"
            columns: ["to_vendor_code"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "transfers_to_vendor_id_fkey"
            columns: ["to_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      vat_codes: {
        Row: {
          code: string
          description: string | null
          gl_account: string | null
          id: string
          rate: number
        }
        Insert: {
          code: string
          description?: string | null
          gl_account?: string | null
          id?: string
          rate?: number
        }
        Update: {
          code?: string
          description?: string | null
          gl_account?: string | null
          id?: string
          rate?: number
        }
        Relationships: []
      }
      vendor_monthly_balances: {
        Row: {
          apply_amount: number | null
          balance: number | null
          created_at: string
          dr_amount: number | null
          id: string
          inv_amount: number | null
          open_amount: number | null
          open_apply: number | null
          open_balance: number | null
          open_dr: number | null
          open_paid: number | null
          paid_amount: number | null
          period_month: string
          period_year: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          apply_amount?: number | null
          balance?: number | null
          created_at?: string
          dr_amount?: number | null
          id?: string
          inv_amount?: number | null
          open_amount?: number | null
          open_apply?: number | null
          open_balance?: number | null
          open_dr?: number | null
          open_paid?: number | null
          paid_amount?: number | null
          period_month: string
          period_year: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          apply_amount?: number | null
          balance?: number | null
          created_at?: string
          dr_amount?: number | null
          id?: string
          inv_amount?: number | null
          open_amount?: number | null
          open_apply?: number | null
          open_balance?: number | null
          open_dr?: number | null
          open_paid?: number | null
          paid_amount?: number | null
          period_month?: string
          period_year?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_monthly_balances_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          ac_add: string | null
          ac_deposit: string | null
          ac_po: string | null
          ac_trade: string | null
          address_line1: string | null
          address_line1_th: string | null
          address_line2: string | null
          address_line2_th: string | null
          address_line3: string | null
          address_line3_th: string | null
          amt_01: number | null
          amt_02: number | null
          amt_03: number | null
          amt_04: number | null
          amt_05: number | null
          amt_06: number | null
          amt_07: number | null
          amt_08: number | null
          amt_09: number | null
          amt_10: number | null
          amt_11: number | null
          amt_12: number | null
          amt_13: number | null
          amt_14: number | null
          amt_15: number | null
          ap_type_code: string | null
          attn: string | null
          card_id: string | null
          city: string | null
          city_th: string | null
          code: string
          country: string | null
          country_th: string | null
          created_at: string
          credit_term: number | null
          deposit_balance: number | null
          email: string | null
          fax: string | null
          id: string
          is_active: boolean | null
          keep_po: boolean | null
          name_en: string
          name_th: string | null
          open_amount: number | null
          open_payment: number | null
          pay_01: number | null
          pay_02: number | null
          pay_03: number | null
          pay_04: number | null
          pay_05: number | null
          pay_06: number | null
          pay_07: number | null
          pay_08: number | null
          pay_09: number | null
          pay_10: number | null
          pay_11: number | null
          pay_12: number | null
          pay_13: number | null
          pay_14: number | null
          pay_15: number | null
          remark: string | null
          tax_id: string | null
          tax_percent: number | null
          tel: string | null
          total_amount: number | null
          total_payment: number | null
          transfer_ap: boolean | null
          updated_at: string
          vat_code: string | null
          vendor_type: string
          wht_card_type: Database["public"]["Enums"]["wht_card_type"] | null
          wht_code: string | null
          wht_percent: number | null
          zip_code: string | null
        }
        Insert: {
          ac_add?: string | null
          ac_deposit?: string | null
          ac_po?: string | null
          ac_trade?: string | null
          address_line1?: string | null
          address_line1_th?: string | null
          address_line2?: string | null
          address_line2_th?: string | null
          address_line3?: string | null
          address_line3_th?: string | null
          amt_01?: number | null
          amt_02?: number | null
          amt_03?: number | null
          amt_04?: number | null
          amt_05?: number | null
          amt_06?: number | null
          amt_07?: number | null
          amt_08?: number | null
          amt_09?: number | null
          amt_10?: number | null
          amt_11?: number | null
          amt_12?: number | null
          amt_13?: number | null
          amt_14?: number | null
          amt_15?: number | null
          ap_type_code?: string | null
          attn?: string | null
          card_id?: string | null
          city?: string | null
          city_th?: string | null
          code: string
          country?: string | null
          country_th?: string | null
          created_at?: string
          credit_term?: number | null
          deposit_balance?: number | null
          email?: string | null
          fax?: string | null
          id?: string
          is_active?: boolean | null
          keep_po?: boolean | null
          name_en: string
          name_th?: string | null
          open_amount?: number | null
          open_payment?: number | null
          pay_01?: number | null
          pay_02?: number | null
          pay_03?: number | null
          pay_04?: number | null
          pay_05?: number | null
          pay_06?: number | null
          pay_07?: number | null
          pay_08?: number | null
          pay_09?: number | null
          pay_10?: number | null
          pay_11?: number | null
          pay_12?: number | null
          pay_13?: number | null
          pay_14?: number | null
          pay_15?: number | null
          remark?: string | null
          tax_id?: string | null
          tax_percent?: number | null
          tel?: string | null
          total_amount?: number | null
          total_payment?: number | null
          transfer_ap?: boolean | null
          updated_at?: string
          vat_code?: string | null
          vendor_type?: string
          wht_card_type?: Database["public"]["Enums"]["wht_card_type"] | null
          wht_code?: string | null
          wht_percent?: number | null
          zip_code?: string | null
        }
        Update: {
          ac_add?: string | null
          ac_deposit?: string | null
          ac_po?: string | null
          ac_trade?: string | null
          address_line1?: string | null
          address_line1_th?: string | null
          address_line2?: string | null
          address_line2_th?: string | null
          address_line3?: string | null
          address_line3_th?: string | null
          amt_01?: number | null
          amt_02?: number | null
          amt_03?: number | null
          amt_04?: number | null
          amt_05?: number | null
          amt_06?: number | null
          amt_07?: number | null
          amt_08?: number | null
          amt_09?: number | null
          amt_10?: number | null
          amt_11?: number | null
          amt_12?: number | null
          amt_13?: number | null
          amt_14?: number | null
          amt_15?: number | null
          ap_type_code?: string | null
          attn?: string | null
          card_id?: string | null
          city?: string | null
          city_th?: string | null
          code?: string
          country?: string | null
          country_th?: string | null
          created_at?: string
          credit_term?: number | null
          deposit_balance?: number | null
          email?: string | null
          fax?: string | null
          id?: string
          is_active?: boolean | null
          keep_po?: boolean | null
          name_en?: string
          name_th?: string | null
          open_amount?: number | null
          open_payment?: number | null
          pay_01?: number | null
          pay_02?: number | null
          pay_03?: number | null
          pay_04?: number | null
          pay_05?: number | null
          pay_06?: number | null
          pay_07?: number | null
          pay_08?: number | null
          pay_09?: number | null
          pay_10?: number | null
          pay_11?: number | null
          pay_12?: number | null
          pay_13?: number | null
          pay_14?: number | null
          pay_15?: number | null
          remark?: string | null
          tax_id?: string | null
          tax_percent?: number | null
          tel?: string | null
          total_amount?: number | null
          total_payment?: number | null
          transfer_ap?: boolean | null
          updated_at?: string
          vat_code?: string | null
          vendor_type?: string
          wht_card_type?: Database["public"]["Enums"]["wht_card_type"] | null
          wht_code?: string | null
          wht_percent?: number | null
          zip_code?: string | null
        }
        Relationships: []
      }
      wht_codes: {
        Row: {
          assign_zero: boolean | null
          code: string
          description: string | null
          gl_account: string | null
          id: string
          rate: number
        }
        Insert: {
          assign_zero?: boolean | null
          code: string
          description?: string | null
          gl_account?: string | null
          id?: string
          rate?: number
        }
        Update: {
          assign_zero?: boolean | null
          code?: string
          description?: string | null
          gl_account?: string | null
          id?: string
          rate?: number
        }
        Relationships: []
      }
      wht_per_supplier: {
        Row: {
          base_amount: number | null
          base_amount2: number | null
          cancel_reason: string | null
          cancelled: boolean | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string | null
          id: string
          line_no: number
          remark: string | null
          supplier_code: string
          typewht: number | null
          updated_at: string
          wht_amount: number | null
          wht_amount2: number | null
          wht_code2: string | null
          wht_date: string | null
          wht_number: number
          wht_rate: number | null
          wht_rate2: number | null
        }
        Insert: {
          base_amount?: number | null
          base_amount2?: number | null
          cancel_reason?: string | null
          cancelled?: boolean | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          line_no?: number
          remark?: string | null
          supplier_code: string
          typewht?: number | null
          updated_at?: string
          wht_amount?: number | null
          wht_amount2?: number | null
          wht_code2?: string | null
          wht_date?: string | null
          wht_number: number
          wht_rate?: number | null
          wht_rate2?: number | null
        }
        Update: {
          base_amount?: number | null
          base_amount2?: number | null
          cancel_reason?: string | null
          cancelled?: boolean | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          line_no?: number
          remark?: string | null
          supplier_code?: string
          typewht?: number | null
          updated_at?: string
          wht_amount?: number | null
          wht_amount2?: number | null
          wht_code2?: string | null
          wht_date?: string | null
          wht_number?: number
          wht_rate?: number | null
          wht_rate2?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wht_per_supplier_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wht_per_supplier_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wht_per_supplier_supplier_code_fkey"
            columns: ["supplier_code"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["code"]
          },
        ]
      }
      withholding_taxes: {
        Row: {
          base_amount: number | null
          base_amount2: number | null
          cond_pay: number | null
          created_at: string
          created_by: string | null
          doc_date: string | null
          doc_number: string | null
          id: string
          payment_id: string | null
          remark: string | null
          tax_amount: number | null
          tax_amount2: number | null
          updated_at: string
          wht_code: string
          wht_code2: string | null
          wht_rate: number | null
          wht_rate2: number | null
        }
        Insert: {
          base_amount?: number | null
          base_amount2?: number | null
          cond_pay?: number | null
          created_at?: string
          created_by?: string | null
          doc_date?: string | null
          doc_number?: string | null
          id?: string
          payment_id?: string | null
          remark?: string | null
          tax_amount?: number | null
          tax_amount2?: number | null
          updated_at?: string
          wht_code: string
          wht_code2?: string | null
          wht_rate?: number | null
          wht_rate2?: number | null
        }
        Update: {
          base_amount?: number | null
          base_amount2?: number | null
          cond_pay?: number | null
          created_at?: string
          created_by?: string | null
          doc_date?: string | null
          doc_number?: string | null
          id?: string
          payment_id?: string | null
          remark?: string | null
          tax_amount?: number | null
          tax_amount2?: number | null
          updated_at?: string
          wht_code?: string
          wht_code2?: string | null
          wht_rate?: number | null
          wht_rate2?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "withholding_taxes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withholding_taxes_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_entity: {
        Args: { p_approval_id: string; p_comment?: string }
        Returns: boolean
      }
      assert_period_open: {
        Args: { p_month: string; p_year: string }
        Returns: undefined
      }
      can_approve: { Args: { module_code: string }; Returns: boolean }
      can_create: { Args: { module_code: string }; Returns: boolean }
      can_delete: { Args: { module_code: string }; Returns: boolean }
      can_read: { Args: { module_code: string }; Returns: boolean }
      can_update: { Args: { module_code: string }; Returns: boolean }
      cancel_invoice: {
        Args: {
          p_cancel_reason: string
          p_cancelled_by: string
          p_invoice_id: string
        }
        Returns: undefined
      }
      decide_invoice_approval: {
        Args: { p_approval_id: string; p_comment?: string; p_decision: string }
        Returns: boolean
      }
      has_module_action: {
        Args: { module_code: string; requested_action: string }
        Returns: boolean
      }
      has_role: { Args: { role_code: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      log_audit: {
        Args: {
          p_action: string
          p_detail?: string
          p_new_data?: Json
          p_old_data?: Json
          p_performed_by?: string
          p_record_id: string
          p_table_name: string
        }
        Returns: undefined
      }
      mark_cheque_cleared: { Args: { p_cheque_id: string }; Returns: undefined }
      next_doc_number:
        | {
            Args: {
              p_digits?: number
              p_field: string
              p_group?: string
              p_prefix?: string
              p_table: string
            }
            Returns: string
          }
        | {
            Args: {
              p_digits?: number
              p_field: string
              p_prefix: string
              p_table: string
            }
            Returns: string
          }
      recalculate_vendor_balance: {
        Args: { p_vendor_code: string }
        Returns: undefined
      }
      reject_entity: {
        Args: { p_approval_id: string; p_comment?: string }
        Returns: boolean
      }
      request_approval: {
        Args: {
          p_comment?: string
          p_entity_id: string
          p_entity_type: Database["public"]["Enums"]["entity_type"]
        }
        Returns: string
      }
      request_invoice_approval: {
        Args: { p_comment?: string; p_invoice_id: string }
        Returns: string
      }
      validate_period_can_close: {
        Args: { p_month: string; p_year: string }
        Returns: string
      }
    }
    Enums: {
      app_currency:
        | "THB"
        | "USD"
        | "EUR"
        | "GBP"
        | "JPY"
        | "CNY"
        | "SGD"
        | "MYR"
      approval_action: "submit" | "approve" | "reject" | "return" | "cancel"
      approval_status: "pending" | "approved" | "rejected" | "returned"
      audit_action:
        | "create"
        | "update"
        | "delete"
        | "approve"
        | "reject"
        | "post"
        | "cancel"
        | "void"
        | "print"
        | "export"
      entity_type: "invoice" | "payment" | "deposit" | "bank_reconciliation"
      invoice_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "rejected"
        | "posted"
        | "cancelled"
        | "voided"
      payment_method:
        | "cash"
        | "cheque"
        | "bank_transfer"
        | "credit_card"
        | "offset"
        | "deposit"
      payment_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "rejected"
        | "paid"
        | "cancelled"
        | "voided"
      vat_type: "inclusive" | "exclusive" | "exempt" | "none"
      wht_card_type:
        | "person"
        | "company"
        | "government"
        | "non_profit"
        | "foreign"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_currency: ["THB", "USD", "EUR", "GBP", "JPY", "CNY", "SGD", "MYR"],
      approval_action: ["submit", "approve", "reject", "return", "cancel"],
      approval_status: ["pending", "approved", "rejected", "returned"],
      audit_action: [
        "create",
        "update",
        "delete",
        "approve",
        "reject",
        "post",
        "cancel",
        "void",
        "print",
        "export",
      ],
      entity_type: ["invoice", "payment", "deposit", "bank_reconciliation"],
      invoice_status: [
        "draft",
        "pending_approval",
        "approved",
        "rejected",
        "posted",
        "cancelled",
        "voided",
      ],
      payment_method: [
        "cash",
        "cheque",
        "bank_transfer",
        "credit_card",
        "offset",
        "deposit",
      ],
      payment_status: [
        "draft",
        "pending_approval",
        "approved",
        "rejected",
        "paid",
        "cancelled",
        "voided",
      ],
      vat_type: ["inclusive", "exclusive", "exempt", "none"],
      wht_card_type: [
        "person",
        "company",
        "government",
        "non_profit",
        "foreign",
      ],
    },
  },
} as const
