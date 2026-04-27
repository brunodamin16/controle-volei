import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseClient'

const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const initialPlayers = [
  'ALINE','ANA','ANDREIA','BABI','BRUNA','FLAVIA','HELO','KAWANY','LAIZ','MARI','MARIA',
  'MONIQUE','MORGANA','SOLANGE','THALYNE','EDUARDA','ISABELA','LETICIA','KAYLANE','THAIS','ESTEFANY'
]

const initialCategories = ['Técnico','Quadra','Campeonatos','Uniformes','Materiais','Outros']

const initialFees = {
  Jan:70, Fev:70, Mar:70, Abr:80, Mai:80, Jun:80,
  Jul:80, Ago:80, Set:80, Out:80, Nov:80, Dez:80
}

function currency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value || 0))
}

function moneyInputValue(value) {
  const number = Number(value || 0)
  if (number === 0) return ''
  return number.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function parseMoneyInput(value) {
  const clean = String(value)
    .replace(/[^\d,.]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')

  return Number(clean || 0)
}

function createPayments(players) {
  const data = {}
  players.forEach((player) => {
    data[player] = {}
    months.forEach((month) => {
      data[player][month] = 0
    })
  })
  return data
}

function createExpenses(categories) {
  const data = {}
  categories.forEach((cat) => {
    data[cat] = {}
    months.forEach((month) => {
      data[cat][month] = 0
    })
  })
  return data
}

function defaultState() {
  return {
    appTitle: 'Controle Financeiro · Time de Vôlei',
    players: initialPlayers,
    categories: initialCategories,
    fees: initialFees,
    payments: createPayments(initialPlayers),
    expenses: createExpenses(initialCategories),
  }
}

export default function App() {
  const [tab, setTab] = useState('inicio')
  const [session, setSession] = useState(null)
  const [role, setRole] = useState('viewer')
  const [loginScreen, setLoginScreen] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMessage, setAuthMessage] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [data, setData] = useState(defaultState)

  const [newPlayer, setNewPlayer] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newAppTitle, setNewAppTitle] = useState('')

  const [manualPaymentMode, setManualPaymentMode] = useState(false)
  const [editPlayersMode, setEditPlayersMode] = useState(false)
  const [editExpensesMode, setEditExpensesMode] = useState(false)
  const [editTitleMode, setEditTitleMode] = useState(false)

  const canEdit = role === 'admin'

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    loadAppData()
  }, [])

  useEffect(() => {
    if (session?.user) {
      loadProfile(session.user.id)
    } else {
      setRole('viewer')
      setManualPaymentMode(false)
      setEditPlayersMode(false)
      setEditExpensesMode(false)
      setEditTitleMode(false)
    }
  }, [session])

  useEffect(() => {
    setNewAppTitle(data.appTitle || 'Controle Financeiro · Time de Vôlei')
  }, [data.appTitle])

  async function loadProfile(userId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    setRole(profile?.role || 'viewer')
  }

  async function loadAppData() {
    setLoading(true)

    const { data: row, error } = await supabase
      .from('app_state')
      .select('data')
      .eq('id', 1)
      .single()

    if (!error && row?.data) {
      setData(normalizeData(row.data))
    }

    setLoading(false)
  }

  function normalizeData(d) {
    const clean = { ...defaultState(), ...d }

    clean.appTitle = clean.appTitle || 'Controle Financeiro · Time de Vôlei'
    clean.players = clean.players || initialPlayers
    clean.categories = clean.categories || initialCategories
    clean.fees = { ...initialFees, ...(clean.fees || {}) }
    clean.payments = clean.payments || createPayments(clean.players)
    clean.expenses = clean.expenses || createExpenses(clean.categories)

    clean.players.forEach((player) => {
      if (!clean.payments[player]) clean.payments[player] = {}

      months.forEach((month) => {
        if (clean.payments[player][month] === undefined) {
          clean.payments[player][month] = 0
        }
      })
    })

    clean.categories.forEach((cat) => {
      if (!clean.expenses[cat]) clean.expenses[cat] = {}

      months.forEach((month) => {
        if (clean.expenses[cat][month] === undefined) {
          clean.expenses[cat][month] = 0
        }
      })
    })

    return clean
  }

  async function saveAppData(nextData) {
    const normalized = normalizeData(nextData)
    setData(normalized)

    if (!canEdit) return

    setSaving(true)

    const { error } = await supabase
      .from('app_state')
      .update({
        data: normalized,
        updated_at: new Date().toISOString()
      })
      .eq('id', 1)

    if (error) {
      alert('Erro ao salvar: ' + error.message)
    }

    setSaving(false)
  }

  async function login() {
    setAuthMessage('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      setAuthMessage('Erro ao entrar: ' + error.message)
      return
    }

    setLoginScreen(false)
    setEmail('')
    setPassword('')
  }

  async function logout() {
    await supabase.auth.signOut()
    setRole('viewer')
    setManualPaymentMode(false)
    setEditPlayersMode(false)
    setEditExpensesMode(false)
    setEditTitleMode(false)
  }

  function updateAppTitle() {
    if (!canEdit) return

    const title = newAppTitle.trim()
    if (!title) return

    saveAppData({
      ...data,
      appTitle: title
    })

    setEditTitleMode(false)
  }

  function updateFees(month, value) {
    if (!canEdit) return

    saveAppData({
      ...data,
      fees: {
        ...data.fees,
        [month]: parseMoneyInput(value)
      }
    })
  }

  function togglePayment(player, month) {
    if (!canEdit) return

    const current = Number(data.payments[player]?.[month] || 0)
    const full = Number(data.fees[month] || 0)

    saveAppData({
      ...data,
      payments: {
        ...data.payments,
        [player]: {
          ...data.payments[player],
          [month]: current > 0 ? 0 : full
        }
      }
    })
  }

  function editPayment(player, month, value) {
    if (!canEdit) return

    saveAppData({
      ...data,
      payments: {
        ...data.payments,
        [player]: {
          ...data.payments[player],
          [month]: parseMoneyInput(value)
        }
      }
    })
  }

  function addPlayer() {
    if (!canEdit) return

    const name = newPlayer.trim().toUpperCase()
    if (!name || data.players.includes(name)) return

    const paymentsForPlayer = {}
    months.forEach((month) => {
      paymentsForPlayer[month] = 0
    })

    saveAppData({
      ...data,
      players: [...data.players, name],
      payments: {
        ...data.payments,
        [name]: paymentsForPlayer
      }
    })

    setNewPlayer('')
  }

  function removePlayer(player) {
    if (!canEdit) return

    const nextPayments = { ...data.payments }
    delete nextPayments[player]

    saveAppData({
      ...data,
      players: data.players.filter((p) => p !== player),
      payments: nextPayments
    })
  }

  function editExpense(category, month, value) {
    if (!canEdit) return

    saveAppData({
      ...data,
      expenses: {
        ...data.expenses,
        [category]: {
          ...data.expenses[category],
          [month]: parseMoneyInput(value)
        }
      }
    })
  }

  function addCategory() {
    if (!canEdit) return

    const name = newCategory.trim()
    if (!name || data.categories.includes(name)) return

    const categoryValues = {}
    months.forEach((month) => {
      categoryValues[month] = 0
    })

    saveAppData({
      ...data,
      categories: [...data.categories, name],
      expenses: {
        ...data.expenses,
        [name]: categoryValues
      }
    })

    setNewCategory('')
  }

  function removeCategory(category) {
    if (!canEdit) return

    const nextExpenses = { ...data.expenses }
    delete nextExpenses[category]

    saveAppData({
      ...data,
      categories: data.categories.filter((c) => c !== category),
      expenses: nextExpenses
    })
  }

  const summary = useMemo(() => {
    let caixa = 0

    const monthly = months.map((month) => {
      const arrecadado = data.players.reduce((sum, player) => {
        return sum + Number(data.payments[player]?.[month] || 0)
      }, 0)

      const despesas = data.categories.reduce((sum, cat) => {
        return sum + Number(data.expenses[cat]?.[month] || 0)
      }, 0)

      const resultado = arrecadado - despesas
      const mensalidade = Number(data.fees[month] || 0)

      const pagos = data.players.filter((player) => {
        return Number(data.payments[player]?.[month] || 0) >= mensalidade && mensalidade > 0
      }).length

      const parciais = data.players.filter((player) => {
        const value = Number(data.payments[player]?.[month] || 0)
        return value > 0 && value < mensalidade
      }).length

      const pendentes = data.players.filter((player) => {
        return Number(data.payments[player]?.[month] || 0) === 0
      }).length

      caixa += resultado

      return {
        month,
        mensalidade,
        pagos,
        parciais,
        pendentes,
        arrecadado,
        despesas,
        resultado,
        caixa
      }
    })

    return {
      monthly,
      caixa,
      arrecadadoAno: monthly.reduce((s, m) => s + m.arrecadado, 0),
      despesasAno: monthly.reduce((s, m) => s + m.despesas, 0),
      pagamentos: data.players.reduce((s, player) => {
        return s + months.filter((month) => {
          return Number(data.payments[player]?.[month] || 0) > 0
        }).length
      }, 0)
    }
  }, [data])

  if (loading) {
    return (
      <div className="app-shell">
        <div className="phone">
          <div className="content">Carregando...</div>
        </div>
      </div>
    )
  }

  if (loginScreen && !session) {
    return (
      <div className="app-shell">
        <div className="phone">
          <div className="notch" />

          <div className="content">
            <div className="header">
              <div className="header-top">
                <div className="logo-row">
                  <div className="logo">🔒</div>

                  <div>
                    <h1>Login do Administrador</h1>
                    <p className="subtitle">Acesse para editar pagamentos e despesas.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card" style={{ marginTop: 18 }}>
              <b>Entrar como admin</b>

              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input
                  className="input"
                  placeholder="Email admin"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <input
                  className="input"
                  placeholder="Senha"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <button className="btn" onClick={login}>
                  Entrar
                </button>

                <button className="btn light" onClick={() => setLoginScreen(false)}>
                  Voltar para visualização
                </button>
              </div>

              {authMessage && (
                <div className="note" style={{ color: '#991b1b', marginTop: 12 }}>
                  {authMessage}
                </div>
              )}

              <div className="note" style={{ marginTop: 12 }}>
                O time não precisa de login. Apenas o administrador entra para editar.
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="phone">
        <div className="notch" />

        <div className="content">
          <div className="header">
            <div className="header-top">
              <div className="logo-row">
                <div className="logo">🏐</div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {!editTitleMode ? (
                      <>
                        <h1>{data.appTitle || 'Controle Financeiro · Time de Vôlei'}</h
