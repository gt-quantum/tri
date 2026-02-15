import { NextRequest } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { getBasicAuthContext } from '@/lib/auth'
import { ApiError, errorResponse } from '@/lib/errors'
import { generateRequestId, successResponse } from '@/lib/response'
import { parseBody } from '@/lib/validation'
import { auditCreate } from '@/lib/audit'
import { createOrgSchema } from '@/lib/schemas/auth'

/**
 * POST /api/v1/auth/create-org
 * Create a new organization for an authenticated user who doesn't have one yet.
 * This is the onboarding endpoint — only callable by users without an org.
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId()

  try {
    const auth = await getBasicAuthContext(request)
    const body = await parseBody(request, createOrgSchema)
    const db = getSupabase()

    // Verify user does NOT already have an org
    const { data: existingUser } = await db
      .from('users')
      .select('id, org_id')
      .eq('id', auth.userId)
      .is('deleted_at', null)
      .single()

    if (existingUser) {
      throw new ApiError(
        'CONFLICT',
        'You already belong to an organization',
        409
      )
    }

    // Generate a URL-safe slug from the org name
    let slug = body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60)

    // Check slug uniqueness, append random suffix if taken
    const { data: slugCheck } = await db
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single()

    if (slugCheck) {
      const suffix = Math.random().toString(36).slice(2, 8)
      slug = `${slug}-${suffix}`
    }

    // Create the organization
    const now = new Date().toISOString()
    const { data: org, error: orgError } = await db
      .from('organizations')
      .insert({
        name: body.name,
        slug,
        org_type: body.org_type,
        industry: body.industry || null,
        settings: {},
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()

    if (orgError) throw orgError

    // Create the user record (role = admin since they're creating the org)
    const { error: userError } = await db.from('users').insert({
      id: auth.userId,
      org_id: org.id,
      email: auth.email,
      full_name: auth.fullName,
      role: 'admin',
      auth_provider: 'email',
      created_at: now,
    })

    if (userError) throw userError

    // Update the org's created_by now that the user record exists
    await db
      .from('organizations')
      .update({ created_by: auth.userId })
      .eq('id', org.id)

    // Update auth user's app_metadata with org_id and role
    const { error: metaError } = await db.auth.admin.updateUserById(
      auth.userId,
      {
        app_metadata: {
          org_id: org.id,
          role: 'admin',
        },
      }
    )

    if (metaError) throw metaError

    // Audit log
    await auditCreate({
      orgId: org.id,
      entityType: 'organization',
      entityId: org.id,
      newValues: { name: body.name, slug, org_type: body.org_type },
      changedBy: auth.userId,
      changeSource: 'system',
    })

    await auditCreate({
      orgId: org.id,
      entityType: 'user',
      entityId: auth.userId,
      newValues: {
        email: auth.email,
        full_name: auth.fullName,
        role: 'admin',
      },
      changedBy: auth.userId,
      changeSource: 'system',
    })

    return successResponse(
      {
        organization: {
          id: org.id,
          name: org.name,
          slug: org.slug,
          org_type: org.org_type,
        },
        user: {
          id: auth.userId,
          email: auth.email,
          role: 'admin',
        },
      },
      requestId,
      201
    )
  } catch (err) {
    return errorResponse(err, requestId)
  }
}
