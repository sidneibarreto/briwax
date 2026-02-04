import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// Cliente normal (não usa service role)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function getAuthenticatedClient(request: NextRequest) {
  const cookieStore = cookies()
  const authToken = request.headers.get('authorization')?.replace('Bearer ', '')
  
  if (!authToken) {
    return null
  }

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      }
    }
  )

  return client
}

export async function GET(request: NextRequest) {
  try {
    const client = await getAuthenticatedClient(request)
    
    if (!client) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Chamar a função SQL segura
    const { data, error } = await client.rpc('list_admin_users')
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ users: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = await getAuthenticatedClient(request)
    
    if (!client) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 })
    }

    // Chamar a função SQL segura
    const { data, error } = await client.rpc('create_admin_user', {
      user_email: email,
      user_password: password
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // A função retorna JSON com success/error
    if (data && !data.success) {
      return NextResponse.json({ error: data.error }, { status: 400 })
    }

    return NextResponse.json({ success: true, user: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const client = await getAuthenticatedClient(request)

    if (!client) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id, password } = await request.json()

    if (!id || !password) {
      return NextResponse.json({ error: 'ID e nova senha são obrigatórios' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'A senha deve ter no mínimo 6 caracteres' }, { status: 400 })
    }

    const { data, error } = await client.rpc('update_admin_password', {
      target_user_id: id,
      new_password: password
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (data && !data.success) {
      return NextResponse.json({ error: data.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const client = await getAuthenticatedClient(request)
    
    if (!client) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('id')

    if (!userId) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 })
    }

    // Chamar a função SQL segura
    const { data, error } = await client.rpc('delete_admin_user', {
      target_user_id: userId
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // A função retorna JSON com success/error
    if (data && !data.success) {
      return NextResponse.json({ error: data.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
