-- Complete the invoice approval path and restore permission helper RPCs used by services.

CREATE OR REPLACE FUNCTION has_module_action(module_code text, requested_action text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM app_users au
      JOIN user_roles ur ON ur.user_id = au.id
      JOIN role_rights rr ON rr.role_id = ur.role_id
     WHERE au.auth_uid = auth.uid()
       AND rr.permitted = true
       AND (
         (rr.resource = '*' AND rr.action = '*')
         OR (
           rr.resource = CASE module_code
             WHEN 'CFG' THEN 'config'
             WHEN 'SUP' THEN 'vendors'
             WHEN 'VCP' THEN 'invoices'
             WHEN 'VPY' THEN 'payments'
             WHEN 'RPT' THEN 'reports'
             WHEN 'APR' THEN 'approvals'
             WHEN 'PER' THEN 'periods'
             WHEN 'MNU' THEN 'menus'
             ELSE module_code
           END
           AND (rr.action = requested_action OR rr.action = '*')
         )
       )
  );
$$;

CREATE OR REPLACE FUNCTION can_create(module_code text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$ SELECT has_module_action(module_code, 'create') $$;

CREATE OR REPLACE FUNCTION can_read(module_code text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$ SELECT has_module_action(module_code, 'read') $$;

CREATE OR REPLACE FUNCTION can_update(module_code text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$ SELECT has_module_action(module_code, 'update') $$;

CREATE OR REPLACE FUNCTION can_delete(module_code text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$ SELECT has_module_action(module_code, 'delete') $$;

CREATE OR REPLACE FUNCTION can_approve(module_code text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$ SELECT has_module_action(module_code, 'approve') $$;

GRANT EXECUTE ON FUNCTION has_module_action(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION can_create(text) TO authenticated;
GRANT EXECUTE ON FUNCTION can_read(text) TO authenticated;
GRANT EXECUTE ON FUNCTION can_update(text) TO authenticated;
GRANT EXECUTE ON FUNCTION can_delete(text) TO authenticated;
GRANT EXECUTE ON FUNCTION can_approve(text) TO authenticated;

CREATE OR REPLACE FUNCTION request_invoice_approval(
  p_invoice_id uuid,
  p_comment text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requester_id uuid;
  v_approval_id uuid;
  v_status invoice_status;
BEGIN
  SELECT id INTO v_requester_id
    FROM app_users
   WHERE auth_uid = auth.uid() AND is_active = true;

  IF v_requester_id IS NULL THEN
    RAISE EXCEPTION 'Active application user is required';
  END IF;

  IF NOT can_update('VCP') AND NOT can_create('VCP') THEN
    RAISE EXCEPTION 'User does not have permission to submit invoices';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('invoice-approval'), hashtext(p_invoice_id::text));

  SELECT status INTO v_status
    FROM invoices
   WHERE id = p_invoice_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;

  IF v_status <> 'draft' THEN
    RAISE EXCEPTION 'Only draft invoices can be submitted for approval';
  END IF;

  IF EXISTS (
    SELECT 1 FROM approvals
     WHERE entity_type = 'invoice'
       AND entity_id = p_invoice_id
       AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'An approval request is already pending for this invoice';
  END IF;

  INSERT INTO approvals (
    entity_type,
    entity_id,
    action,
    status,
    comment,
    level_no,
    requested_by,
    requested_at
  ) VALUES (
    'invoice',
    p_invoice_id,
    'submit',
    'pending',
    NULLIF(trim(p_comment), ''),
    1,
    v_requester_id,
    now()
  ) RETURNING id INTO v_approval_id;

  UPDATE invoices
     SET status = 'pending_approval', updated_at = now()
   WHERE id = p_invoice_id;

  RETURN v_approval_id;
END;
$$;

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

  IF v_approval.requested_by = v_approver_id THEN
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

GRANT EXECUTE ON FUNCTION request_invoice_approval(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION decide_invoice_approval(uuid, text, text) TO authenticated;
