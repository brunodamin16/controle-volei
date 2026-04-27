import React, { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export default function App() {
  const [session, setSession] = useState(null)
  const [showLogin, setShowLogin] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('viewer')

  const canEdit = role === 'admin'

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session?.user) {
      loadProfile(session.user.id)
    } else {
      setRole('viewer')
    }
  }, [session])

  async function loadProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    setRole(data?.role || 'viewer')
  }

  async function login() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      alert(error.message)
    } else {
      setShowLogin(false)
    }
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  return (
    <div style={{ padding: 20, fontFamily: 'Arial' }}>
      
      {/* HEADER */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#111',
        color: '#fff',
        padding: 15,
        borderRadius: 10
      }}>
        <div>
          <h2>🏐 Controle do Time</h2>
          <small>Apenas admin edita</small>
        </div>

        {!session ? (
          <button onClick={() => setShowLogin(true)}>
            🔒 Login
          </button>
        ) : (
          <div>
            <span style={{
              marginRight: 10,
              color: canEdit ? 'lime' : 'gray'
            }}>
              {canEdit ? 'ADMIN' : 'VISUAL'}
            </span>

            <button onClick={logout}>
              Sair
            </button>
          </div>
        )}
      </div>

      {/* LOGIN */}
      {showLogin && !session && (
        <div style={{
          marginTop: 20,
          padding: 20,
          border: '1px solid #ccc',
          borderRadius: 10
        }}>
          <h3>🔒 Login</h3>

          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ display: 'block', marginBottom: 10 }}
          />

          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ display: 'block', marginBottom: 10 }}
          />

          <button onClick={login}>Entrar</button>
        </div>
      )}

      {/* CONTEÚDO */}
      <div style={{ marginTop: 20 }}>
        <h3>📊 App funcionando</h3>

        <p>
          {canEdit
            ? 'Você é ADMIN — pode editar tudo'
            : 'Modo visualização'}
        </p>
      </div>

    </div>
  )
}
