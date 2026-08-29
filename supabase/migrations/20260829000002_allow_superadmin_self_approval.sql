-- Explicitly allow only ADMIN/SUPERADMIN to approve their own invoice.
-- Other roles retain segregation-of-duties protection.

CREATE OR REPLACE FUNCTION decide_invoice_approval(
  p_approval_id uuid,
  p_decision text,
  p_comment text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_approver_id uuid;
  v_approval approvals%ROWTYPE;
BEGIN
  IF p_decision NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'Decision must be approve or reject';
  END IF;

  SELECT id INTO v_approver_id
    FROM app_users
   WHERE auth_uid = auth.uid() AND is_active = true;

  IF v_approver_id IS NULL THEN
    RAISE EXCEPTION 'Active application user is required';
  END IF;

  IF NOT can_approve('VCP') THEN
    RAISE EXCEPTION 'User does not have permission to approve invoices';
  END IF;

  SELECT * INTO v_approval
    FROM approvals
   WHERE id = p_approval_id
     AND entity_type = 'invoice'
   FOR UPDATE;

  IF NOT FOUND OR v_approval.status <> 'pending' THEN
    RAISE EXCEPTION 'Pending invoice approval not found';
  END IF;

  IF v_approval.requested_by = v_approver_id AND NOT is_admin() THEN
    RAISE EXCEPTION 'Requester cannot approve or reject their own invoice';
  END IF;

  IF p_decision = 'reject' AND NULLIF(trim(p_comment), '') IS NULL THEN
    RAISE EXCEPTION 'Rejection reason is required';
  END IF;

  UPDATE approvals
   SET action = p_decision::approval_action,
       status = CASE
           WHEN p_decision = 'approve' THEN 'approved'::approval_status
           ELSE 'rejected'::approval_status
         END,
       comment = COALESCE(NULLIF(trim(p_comment), ''), comment),
       approved_by = v_approver_id,
       approved_at = now()
   WHERE id = p_approval_id;

  UPDATE invoices
     SET status = CASE
           WHEN p_decision = 'approve' THEN 'approved'::invoice_status
           ELSE 'rejected'::invoice_status
         END,
         updated_at = now()
   WHERE id = v_approval.entity_id
     AND status = 'pending_approval';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice is not pending approval';
  END IF;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION decide_invoice_approval(uuid, text, text) TO authenticated;
