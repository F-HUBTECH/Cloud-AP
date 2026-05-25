#!/bin/bash
# KSAP - Initial Setup Script
# 
# This script creates the initial admin user and assigns the SUPERADMIN role.
# Run this after deploying the database schema.
#
# Prerequisites:
# - Service Role Key from https://supabase.com/dashboard/project/yboyoqifawebmhkimexi/settings/api
# - Set SUPABASE_SERVICE_ROLE_KEY environment variable before running
#
# Usage:
#   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
#   chmod +x scripts/setup-admin.sh
#   ./scripts/setup-admin.sh

set -e

SUPABASE_URL="https://yboyoqifawebmhkimexi.supabase.co"

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required"
  echo "Get it from: https://supabase.com/dashboard/project/yboyoqifawebmhkimexi/settings/api"
  echo "Usage: export SUPABASE_SERVICE_ROLE_KEY=\"your-key\" && ./scripts/setup-admin.sh"
  exit 1
fi

echo "=== KSAP Initial Setup ==="
echo ""

# Step 1: Create admin auth user
echo "Step 1: Creating admin user..."
ADMIN_RESPONSE=$(curl -s -X POST "$SUPABASE_URL/auth/v1/admin/users" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ksap.local",
    "password": "Admin@123456",
    "email_confirm": true,
    "user_metadata": {
      "full_name": "Administrator",
      "login_name": "admin"
    }
  }')

ADMIN_ID=$(echo "$ADMIN_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null)

if [ -z "$ADMIN_ID" ]; then
  echo "Failed to create admin user. Response: $ADMIN_RESPONSE"
  echo "The user may already exist. Trying to look up existing user..."
  
  # Try to find existing user
  ADMIN_RESPONSE=$(curl -s "$SUPABASE_URL/auth/v1/admin/users?email=admin@ksap.local" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY")
  
  ADMIN_ID=$(echo "$ADMIN_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['users'][0]['id'])" 2>/dev/null)
  
  if [ -z "$ADMIN_ID" ]; then
    echo "Could not find or create admin user. Please create manually."
    exit 1
  fi
  echo "Found existing admin user: $ADMIN_ID"
else
  echo "Created admin user: $ADMIN_ID"
fi

# Step 2: Check app_users entry was auto-created by trigger
echo ""
echo "Step 2: Verifying app_users entry..."
sleep 2

APP_USER_ID=$(curl -s "$SUPABASE_URL/rest/v1/app_users?select=id&auth_uid=eq.$ADMIN_ID" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])" 2>/dev/null)

if [ -z "$APP_USER_ID" ]; then
  echo "Auto-create trigger did not fire. Creating app_users entry manually..."
  curl -s -X POST "$SUPABASE_URL/rest/v1/app_users" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d "{
      \"auth_uid\": \"$ADMIN_ID\",
      \"login_name\": \"admin\",
      \"display_name\": \"Administrator\",
      \"email\": \"admin@ksap.local\",
      \"is_active\": true
    }" > /dev/null
  
  APP_USER_ID=$(curl -s "$SUPABASE_URL/rest/v1/app_users?select=id&auth_uid=eq.$ADMIN_ID" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])" 2>/dev/null)
fi

echo "App user ID: $APP_USER_ID"

# Step 3: Assign SUPERADMIN role
echo ""
echo "Step 3: Assigning SUPERADMIN role..."

SUPERADMIN_ROLE_ID=$(curl -s "$SUPABASE_URL/rest/v1/roles?select=id&code=eq.SUPERADMIN" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])" 2>/dev/null)

if [ -z "$SUPERADMIN_ROLE_ID" ]; then
  echo "Error: SUPERADMIN role not found in database."
  exit 1
fi

# Check if role already assigned
EXISTING=$(curl -s "$SUPABASE_URL/rest/v1/user_roles?select=id&user_id=eq.$APP_USER_ID&role_id=eq.$SUPERADMIN_ROLE_ID" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY")

if [ "$EXISTING" = "[]" ]; then
  curl -s -X POST "$SUPABASE_URL/rest/v1/user_roles" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"user_id\": \"$APP_USER_ID\",
      \"role_id\": \"$SUPERADMIN_ROLE_ID\"
    }" > /dev/null
  echo "SUPERADMIN role assigned."
else
  echo "SUPERADMIN role already assigned."
fi

# Step 4: Update .env.local
echo ""
echo "Step 4: Updating .env.local..."
sed -i "s|SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY|" .env.local 2>/dev/null || \
  echo "SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY" >> .env.local

echo ""
echo "=== Setup Complete! ==="
echo "Admin user: admin@ksap.local"
echo "Password: Admin@123456"
echo ""
echo "Next steps:"
echo "1. Update .env.local with your SUPABASE_SERVICE_ROLE_KEY (if not updated)"
echo "2. Run: npm run dev"
echo "3. Open http://localhost:3000 and login with admin@ksap.local / Admin@123456"