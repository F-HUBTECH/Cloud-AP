export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "TKAP Accounts Payable API",
    version: "1.0.0",
    description: "Publicly exposed API endpoints for the TKAP application.",
  },
  servers: [{ url: "/" }],
  tags: [{ name: "Supabase Webhooks" }],
  paths: {
    "/api/webhooks/supabase": {
      post: {
        tags: ["Supabase Webhooks"],
        summary: "Process a Supabase database webhook",
        description:
          "Recalculates vendor balances and synchronizes cheque status for supported database events.",
        security: [{ webhookBearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/WebhookEvent" },
              examples: {
                invoiceCreated: {
                  summary: "Invoice inserted",
                  value: {
                    type: "INSERT",
                    table: "invoices",
                    schema: "public",
                    record: {
                      id: "00000000-0000-0000-0000-000000000000",
                      supplier_id: "00000000-0000-0000-0000-000000000000",
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Webhook processed successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["success", "table", "type"],
                  properties: {
                    success: { type: "boolean", example: true },
                    table: { type: "string", example: "invoices" },
                    type: { type: "string", example: "INSERT" },
                  },
                },
              },
            },
          },
          "400": { description: "Unsupported table" },
          "401": { description: "Invalid webhook bearer token" },
          "500": { description: "Internal server error" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      webhookBearerAuth: {
        type: "http",
        scheme: "bearer",
        description:
          "Required when SUPABASE_WEBHOOK_SECRET is configured on the server.",
      },
    },
    schemas: {
      WebhookEvent: {
        type: "object",
        required: ["type", "table", "schema", "record"],
        properties: {
          type: {
            type: "string",
            enum: ["INSERT", "UPDATE", "DELETE"],
            description: "Database event type.",
          },
          table: {
            type: "string",
            enum: [
              "invoices",
              "invoice_items",
              "payments",
              "payment_items",
              "vendors",
              "deposit_payments",
              "transfers",
              "withholding_taxes",
              "bank_reconciliations",
              "periods",
            ],
          },
          schema: { type: "string", example: "public" },
          record: {
            type: "object",
            additionalProperties: true,
            description: "The new database record.",
          },
          old_record: {
            type: "object",
            additionalProperties: true,
            description: "The previous database record, when available.",
          },
        },
      },
    },
  },
} as const;
