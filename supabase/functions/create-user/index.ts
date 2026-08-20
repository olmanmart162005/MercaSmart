// Supabase Edge Function: create-user
// Esta función crea un nuevo usuario en Supabase Auth usando la SERVICE_ROLE_KEY
// sin alterar la sesión del administrador que la invoca.
//
// Deploy: supabase functions deploy create-user --no-verify-jwt
// Secrets: supabase secrets set SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Verificar que quien llama es un admin o super_admin autenticado
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Cliente con anon key para verificar el JWT del solicitante
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser()
    if (callerErr || !caller) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verificar rol del solicitante
    const { data: callerProfile } = await callerClient
      .from('profiles')
      .select('role, branch_id')
      .eq('id', caller.id)
      .single()

    if (!callerProfile || !['super_admin', 'admin'].includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Leer los datos del nuevo usuario desde el body
    const body = await req.json()
    const { username, full_name, password, role, branch_id, is_active = true } = body

    if (!username || !full_name || !password) {
      return new Response(JSON.stringify({ error: 'username, full_name y password son requeridos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Admin solo puede crear en su propia sucursal
    const targetBranchId = callerProfile.role === 'super_admin'
      ? (branch_id || null)
      : callerProfile.branch_id

    // Admin no puede crear super_admin
    const targetRole = callerProfile.role === 'admin' && role === 'super_admin' ? 'admin' : role

    // 3. Crear usuario usando el cliente con SERVICE_ROLE_KEY (Admin API)
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const email = `${username.trim().toLowerCase()}@mercasmart.com`

    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirmado, no requiere email de confirmación
      user_metadata: {
        username: username.trim().toLowerCase(),
        full_name: full_name.trim(),
        role: targetRole,
        branch_id: targetBranchId,
      },
    })

    if (createErr) {
      return new Response(JSON.stringify({ error: createErr.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4. Crear el perfil en la tabla profiles
    const { error: profileErr } = await adminClient.from('profiles').upsert(
      {
        id: newUser.user.id,
        username: username.trim().toLowerCase(),
        full_name: full_name.trim(),
        role: targetRole,
        branch_id: targetBranchId,
        is_active,
      },
      { onConflict: 'id' }
    )

    if (profileErr) {
      // Rollback: eliminar el usuario creado si no se pudo crear el perfil
      await adminClient.auth.admin.deleteUser(newUser.user.id)
      return new Response(JSON.stringify({ error: 'Error al crear perfil: ' + profileErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUser.user.id,
          email,
          username: username.trim().toLowerCase(),
          full_name: full_name.trim(),
          role: targetRole,
          branch_id: targetBranchId,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
