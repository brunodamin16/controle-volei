import React, { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function formatMoney(v) {
  if (!v) return ''
  return Number(v).toLocaleString('pt-BR')
}

export default function App() {
  const [session, setSession] = useState(null)
  const [role, setRole] = useState('viewer')
  const [loginScreen, setLoginScreen] = useState(false)

  const [title, setTitle] = useState('Controle Financeiro · Time de Vôlei')
  const [editingTitle, setEditingTitle] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const canEdit = role === 'admin'

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })
  }, [])

  async function login() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (!error) {
      setRole('admin')
      setLoginScreen(false)
    } else {
      alert(error.message)
    }
  }

  function logout() {
    supabase.auth.signOut()
    setRole('viewer')
  }

  function handleMoneyChange(setter, value) {
    const onlyNumbers = value.replace(/\D/g, '')
    setter(onlyNumbers)
  }

  if (loginScreen && !session) {
    return (
      <div style={{ padding: 20 }}>
        <h2>🔒 Login</h2>

        <input
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Senha"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={login}>Entrar</button>
        <button onClick={() => setLoginScreen(false)}>Voltar</button>
      </div>
    )
  }

  return (
    <div style={{ padding: 16 }}>

      {/* HEADER */}
      <div style={{
        background: '#111',
        color: '#fff',
        padding: 12,
        borderRadius: 10,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          
          {!editingTitle ? (
            <>
              <h3 style={{ margin: 0 }}>{title}</h3>

              {canEdit && (
                <span
                  style={{ cursor: 'pointer' }}
                  onClick={() => setEditingTitle(true)}
                >
                  ✏️
                </span>
              )}
            </>
          ) : (
            <>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <button onClick={() => setEditingTitle(false)}>
                salvar
              </button>
            </>
          )}
        </div>

        {!session ? (
          <button onClick={() => setLoginScreen(true)}>
            🔒 Login
          </button>
        ) : (
          <button onClick={logout}>Sair</button>
        )}
      </div>

      {/* EXEMPLO DE INPUT CORRIGIDO */}
      <div style={{ marginTop: 20 }}>
        <h4>Exemplo valor (corrigido)</h4>

        <MoneyInput />
      </div>

    </div>
  )
}

/* COMPONENTE DE DINHEIRO CORRETO */
function MoneyInput() {
  const [value, setValue] = useState('')

  function handleChange(e) {
    const raw = e.target.value.replace(/\D/g, '')
    setValue(raw)
  }

  return (
    <input
      value={formatMoney(value)}
      onChange={handleChange}
      placeholder="Digite valor"
    />
  )
}
