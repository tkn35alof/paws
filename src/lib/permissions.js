// PAWS — permission catalog (the source of truth)
// Keep this in sync with supabase/p5b_perms_rls.sql and src/pages/Admin.jsx

export const PERMISSIONS = [
  { key: 'can_edit_projects',      label: 'Edit projects',      hint: 'Create / edit / publish projects' },
  { key: 'can_edit_testimonials',  label: 'Edit testimonials',  hint: 'Create / publish client testimonials' },
  { key: 'can_invite',             label: 'Send invites',       hint: 'Create invite codes for new team members' },
  { key: 'can_edit_site_content',  label: 'Edit site content',  hint: 'Edit About / Mission / Vision / Contact copy' },
  { key: 'can_publish',            label: 'Self-publish',       hint: 'Toggle their own profile published/hidden' },
  { key: 'can_manage_members',     label: 'Manage members',     hint: 'Edit / delete other members and their permissions' },
  { key: 'can_upload_photo',       label: 'Upload own photo',   hint: 'Upload a new profile photo to the members portal' },
  { key: 'can_standardize_photo',  label: 'Standardize own photo', hint: 'Publish their own photo to the public team grid' },
  { key: 'can_delete_member',      label: 'Delete members',     hint: 'Remove members from the team' },
]
