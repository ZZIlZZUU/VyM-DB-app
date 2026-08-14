import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const { userIdToDelete, emailToDelete } = body

    if (!userIdToDelete && !emailToDelete) {
      return new Response(JSON.stringify({ error: 'Se requiere userIdToDelete o emailToDelete' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    // Cliente con anon key + token del caller para validar autenticación
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser()
    if (callerErr || !caller) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Cliente con service role key para operaciones administrativas
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Verificar que el caller tenga rol admin en usuarios_autorizados
    const { data: callerRecord, error: callerRecordErr } = await adminClient
      .from('usuarios_autorizados')
      .select('rol')
      .eq('email', caller.email)
      .single()

    if (callerRecordErr || callerRecord?.rol !== 'admin') {
      return new Response(JSON.stringify({ error: 'Solo administradores pueden eliminar usuarios' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let targetUserId = userIdToDelete
    let targetEmail = emailToDelete ? emailToDelete.trim().toLowerCase() : ''

    // Si nos pasaron emailToDelete, buscar el ID en auth.users
    if (!targetUserId && targetEmail) {
      // Prevenir auto-eliminación por email
      if (caller.email?.toLowerCase() === targetEmail) {
        return new Response(JSON.stringify({ error: 'No puedes eliminarte a ti mismo' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: userListData, error: listErr } = await adminClient.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      })

      if (listErr) {
        throw listErr
      }

      const matchingUser = userListData?.users?.find(
        (u) => u.email?.toLowerCase() === targetEmail
      )
      if (matchingUser) {
        targetUserId = matchingUser.id
      }
    }

    // Si nos pasaron userIdToDelete, obtener el email para borrar de usuarios_autorizados
    if (targetUserId) {
      // Prevenir auto-eliminación por ID
      if (caller.id === targetUserId) {
        return new Response(JSON.stringify({ error: 'No puedes eliminarte a ti mismo' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (!targetEmail) {
        const { data: targetAuth } = await adminClient.auth.admin.getUserById(targetUserId)
        targetEmail = targetAuth?.user?.email?.toLowerCase() ?? ''
      }

      // Eliminar de auth.users
      const { error: deleteAuthErr } = await adminClient.auth.admin.deleteUser(targetUserId)
      if (deleteAuthErr) {
        throw deleteAuthErr
      }
    }

    // Eliminar de usuarios_autorizados si tenemos el email
    if (targetEmail) {
      const { error: deleteDbErr } = await adminClient
        .from('usuarios_autorizados')
        .delete()
        .eq('email', targetEmail)

      if (deleteDbErr) {
        throw deleteDbErr
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Error interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
