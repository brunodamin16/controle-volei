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

function formatMoneyInput(value) {
  const number = Number(value || 0)
  if (number === 0) return ''

  return number.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function cleanMoneyTyping(value) {
  return String(value || '')
    .replace(/[^\d,]/g, '')
    .replace(/(,.*),/g, '$1')
}

function parseMoneyValue(value) {
  if (!value) return 0
  const cleaned = cleanMoneyTyping(value).replace(',', '.')
  return Number(cleaned || 0)
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

  const [manualPaymentMode, setManualPaymentMode] = useState(false)
  const [editPlayersMode, setEditPlayersMode] = useState(false)
  const [editExpensesMode, setEditExpensesMode] = useState(false)

  const [editingTitle, setEditingTitle] = useState(false)
  const [tempTitle, setTempTitle] = useState('')

  const [draftValues, setDraftValues] = useState({})

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
      setEditingTitle(false)
    }
  }, [session])

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
    setEditingTitle(false)
  }

  function startEditTitle() {
    if (!canEdit) return
    setTempTitle(data.appTitle || 'Controle Financeiro · Time de Vôlei')
    setEditingTitle(true)
  }

  function saveTitle() {
    if (!canEdit) return

    const title = tempTitle.trim()
    if (!title) return

    saveAppData({
      ...data,
      appTitle: title
    })

    setEditingTitle(false)
  }

  function startMoneyDraft(key, value) {
    setDraftValues((prev) => ({
      ...prev,
      [key]: value && Number(value) !== 0 ? String(value).replace('.', ',') : ''
    }))
  }

  function updateMoneyDraft(key, value) {
    setDraftValues((prev) => ({
      ...prev,
      [key]: cleanMoneyTyping(value)
    }))
  }

  function clearMoneyDraft(key) {
    setDraftValues((prev) => {
      const copy = { ...prev }
      delete copy[key]
      return copy
    })
  }

  function updateFees(month, value) {
    if (!canEdit) return

    saveAppData({
      ...data,
      fees: {
        ...data.fees,
        [month]: parseMoneyValue(value)
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
          [month]: parseMoneyValue(value)
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
          [month]: parseMoneyValue(value)
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

  function sendWhatsAppReport() {
    if (!canEdit) return

    const now = new Date()
    const date = now.toLocaleDateString('pt-BR')

    const currentMonthIndex = now.getMonth()
    const reportMonthIndex = currentMonthIndex === 0 ? 11 : currentMonthIndex - 1
    const reportMonth = months[reportMonthIndex]
    const monthData = summary.monthly.find((m) => m.month === reportMonth)

    if (!monthData) return

    const totalPlayers = data.players.length
    const paidPlayers = monthData.pagos
    const paidPercent = totalPlayers > 0
      ? ((paidPlayers / totalPlayers) * 100).toFixed(0)
      : 0

    const message = `
🏐 ${data.appTitle || 'Controle Financeiro do Time'}

📅 Data: ${date}

💰 Caixa atual: ${currency(summary.caixa)}
📈 Arrecadado no mês: ${currency(monthData.arrecadado)}
💸 Gastos no mês: ${currency(monthData.despesas)}
✅ Pagamentos lançados em ${reportMonth}: ${paidPlayers}/${totalPlayers} jogadoras (${paidPercent}%)

📊 Balanço geral de ${reportMonth}:
${reportMonth}: Arrecadado ${currency(monthData.arrecadado)} | Gastos ${currency(monthData.despesas)} | ${paidPlayers}/${totalPlayers} jogadoras (${paidPercent}%) | Caixa ${currency(monthData.caixa)}

Enviado pelo app de controle do time
`

    const url = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

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

            <div className="card">
              <b>👀 Para o time</b>
              <div className="note">
                Quem tiver o link acessa direto o modo visualização, sem senha.
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
                  {!editingTitle ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <h1>{data.appTitle || 'Controle Financeiro · Time de Vôlei'}</h1>

                      {canEdit && (
                        <button
                          className="btn light"
                          onClick={startEditTitle}
                          style={{
                            padding: '3px 6px',
                            fontSize: 12,
                            borderRadius: 8,
                            lineHeight: 1
                          }}
                          title="Editar nome"
                        >
                          ✏️
                        </button>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        className="input"
                        value={tempTitle}
                        onChange={(e) => setTempTitle(e.target.value)}
                        style={{ maxWidth: 260 }}
                        autoFocus
                      />

                      <button className="btn" onClick={saveTitle}>
                        Salvar
                      </button>

                      <button className="btn light" onClick={() => setEditingTitle(false)}>
                        Cancelar
                      </button>
                    </div>
                  )}

                  <p className="subtitle">Time visualiza sem login. Só admin edita.</p>
                </div>
              </div>

              {!session ? (
                <button className="btn light" onClick={() => setLoginScreen(true)}>
                  🔒 Login
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className={'badge ' + (canEdit ? 'admin' : 'viewer')}>
                    {canEdit ? 'ADMIN' : 'VISUALIZAÇÃO'}
                  </span>

                  <button className="btn red" onClick={logout}>
                    Sair
                  </button>
                </div>
              )}
            </div>
          </div>

          {!session && (
            <div className="card">
              <b>👀 Modo visualização</b>
              <div className="note">
                Qualquer pessoa com o link pode acompanhar. Para editar, clique em Login no topo.
              </div>
            </div>
          )}

          {session && (
            <div className="card">
              <div className="header-top">
                <div>
                  <b>{canEdit ? '✅ Administrador ativo' : '👀 Visualizador'}</b>
                  <div className="note">{session.user.email}</div>
                </div>
              </div>
            </div>
          )}

          <div className="tabs">
            <button
              className={'tab ' + (tab === 'inicio' ? 'active' : '')}
              onClick={() => setTab('inicio')}
            >
              Início
            </button>

            <button
              className={'tab ' + (tab === 'pagamentos' ? 'active' : '')}
              onClick={() => setTab('pagamentos')}
            >
              Pagamentos
            </button>

            <button
              className={'tab ' + (tab === 'despesas' ? 'active' : '')}
              onClick={() => setTab('despesas')}
            >
              Despesas
            </button>
          </div>

          {tab === 'inicio' && (
            <>
              <div className="grid-cards">
                <Metric title="💰 Caixa Atual" value={currency(summary.caixa)} highlight />
                <Metric title="📈 Arrecadado Ano" value={currency(summary.arrecadadoAno)} />
                <Metric title="💸 Despesas Ano" value={currency(summary.despesasAno)} />
                <Metric title="✅ Pagamentos" value={summary.pagamentos} />
              </div>

              <div className="card">
                <h2 className="panel-title">📊 Visão mês a mês</h2>

                <div className="scroll">
                  <table className="min-wide">
                    <thead>
                      <tr>
                        <th>Mês</th>
                        <th>Mensalidade</th>
                        <th>Pagos</th>
                        <th>Parciais</th>
                        <th>Pendentes</th>
                        <th>Arrecadado</th>
                        <th>Despesas</th>
                        <th>Resultado</th>
                        <th>Caixa</th>
                        <th>Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {summary.monthly.map((m) => (
                        <tr key={m.month}>
                          <td><b>{m.month}</b></td>
                          <td>{currency(m.mensalidade)}</td>
                          <td>{m.pagos}</td>
                          <td>{m.parciais}</td>
                          <td>{m.pendentes}</td>
                          <td>{currency(m.arrecadado)}</td>
                          <td>{currency(m.despesas)}</td>
                          <td className={m.resultado >= 0 ? 'bg-green' : 'bg-red'}>
                            {currency(m.resultado)}
                          </td>
                          <td>{currency(m.caixa)}</td>
                          <td>{m.resultado >= 0 ? '🟢 Positivo' : '🔴 Negativo'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {tab === 'pagamentos' && (
            <>
              <div className="card">
                <h2 className="panel-title">💵 Mensalidade por mês</h2>

                <div className="month-grid">
                  {months.map((month) => {
                    const key = `fee-${month}`

                    return (
                      <label className="month-box" key={month}>
                        <span>{month}</span>

                        <input
                          className="money-input"
                          disabled={!canEdit}
                          type="text"
                          inputMode="decimal"
                          value={
                            draftValues[key] !== undefined
                              ? draftValues[key]
                              : formatMoneyInput(data.fees[month])
                          }
                          onFocus={() => startMoneyDraft(key, data.fees[month])}
                          onChange={(e) => updateMoneyDraft(key, e.target.value)}
                          onBlur={() => {
                            updateFees(month, draftValues[key] || '')
                            clearMoneyDraft(key)
                          }}
                          placeholder="0,00"
                        />
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="card">
                <div className="top-actions">
                  {canEdit && (
                    <>
                      <button
                        className={'btn ' + (manualPaymentMode ? 'blue' : '')}
                        onClick={() => setManualPaymentMode(!manualPaymentMode)}
                      >
                        ✏️ {manualPaymentMode ? 'Ocultar valores' : 'Editar valores'}
                      </button>

                      <button
                        className={'btn ' + (editPlayersMode ? 'yellow' : 'light')}
                        onClick={() => setEditPlayersMode(!editPlayersMode)}
                      >
                        ✏️ Jogadoras
                      </button>
                    </>
                  )}
                </div>

                {canEdit && editPlayersMode && (
                  <div className="add-row" style={{ marginTop: 10 }}>
                    <input
                      className="input"
                      placeholder="Nova jogadora"
                      value={newPlayer}
                      onChange={(e) => setNewPlayer(e.target.value)}
                    />

                    <button className="btn" onClick={addPlayer}>
                      Adicionar
                    </button>
                  </div>
                )}

                <div className="scroll" style={{ marginTop: 12 }}>
                  <table className="min-extra">
                    <thead>
                      <tr>
                        <th>Jogadora</th>
                        {months.map((m) => <th key={m}>{m}</th>)}
                        <th>Total</th>
                        <th>Ação</th>
                      </tr>
                    </thead>

                    <tbody>
                      {data.players.map((player) => {
                        const total = months.reduce((s, month) => {
                          return s + Number(data.payments[player]?.[month] || 0)
                        }, 0)

                        return (
                          <tr key={player}>
                            <td className="left">{player}</td>

                            {months.map((month) => {
                              const key = `pay-${player}-${month}`
                              const value = Number(data.payments[player]?.[month] || 0)
                              const full = Number(data.fees[month] || 0)
                              const paid = value > 0

                              const cellClass =
                                value >= full && full > 0
                                  ? 'bg-green'
                                  : paid
                                    ? 'bg-yellow'
                                    : ''

                              return (
                                <td key={month} className={cellClass}>
                                  {manualPaymentMode && canEdit ? (
                                    <input
                                      className="money-input"
                                      type="text"
                                      inputMode="decimal"
                                      value={
                                        draftValues[key] !== undefined
                                          ? draftValues[key]
                                          : formatMoneyInput(value)
                                      }
                                      onFocus={() => startMoneyDraft(key, value)}
                                      onChange={(e) => updateMoneyDraft(key, e.target.value)}
                                      onBlur={() => {
                                        editPayment(player, month, draftValues[key] || '')
                                        clearMoneyDraft(key)
                                      }}
                                      placeholder="0,00"
                                    />
                                  ) : (
                                    <button
                                      disabled={!canEdit}
                                      className={'check ' + (paid ? 'paid' : '')}
                                      onClick={() => togglePayment(player, month)}
                                    >
                                      {paid ? '✓' : ''}
                                    </button>
                                  )}
                                </td>
                              )
                            })}

                            <td><b>{currency(total)}</b></td>

                            <td>
                              {canEdit && editPlayersMode ? (
                                <button className="btn red" onClick={() => removePlayer(player)}>
                                  Remover
                                </button>
                              ) : (
                                '—'
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="note">
                  Normal: só check. ✏️ Editar valores libera valores manuais para pagamentos parciais.
                </div>
              </div>
            </>
          )}

          {tab === 'despesas' && (
            <div className="card">
              <div className="top-actions">
                {canEdit && (
                  <button
                    className={'btn ' + (editExpensesMode ? 'yellow' : '')}
                    onClick={() => setEditExpensesMode(!editExpensesMode)}
                  >
                    ✏️ {editExpensesMode ? 'Bloquear edição' : 'Editar despesas'}
                  </button>
                )}
              </div>

              {canEdit && editExpensesMode && (
                <div className="add-row" style={{ marginTop: 10 }}>
                  <input
                    className="input"
                    placeholder="Nova despesa"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                  />

                  <button className="btn" onClick={addCategory}>
                    Adicionar
                  </button>
                </div>
              )}

              <div className="scroll" style={{ marginTop: 12 }}>
                <table className="min-extra">
                  <thead>
                    <tr>
                      <th>Categoria</th>
                      {months.map((m) => <th key={m}>{m}</th>)}
                      <th>Total</th>
                      <th>Ação</th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.categories.map((cat) => {
                      const total = months.reduce((s, month) => {
                        return s + Number(data.expenses[cat]?.[month] || 0)
                      }, 0)

                      return (
                        <tr key={cat}>
                          <td className="left">{cat}</td>

                          {months.map((month) => {
                            const key = `exp-${cat}-${month}`

                            return (
                              <td key={month}>
                                <input
                                  className="money-input"
                                  disabled={!canEdit}
                                  type="text"
                                  inputMode="decimal"
                                  value={
                                    draftValues[key] !== undefined
                                      ? draftValues[key]
                                      : formatMoneyInput(data.expenses[cat]?.[month])
                                  }
                                  onFocus={() => startMoneyDraft(key, data.expenses[cat]?.[month])}
                                  onChange={(e) => updateMoneyDraft(key, e.target.value)}
                                  onBlur={() => {
                                    editExpense(cat, month, draftValues[key] || '')
                                    clearMoneyDraft(key)
                                  }}
                                  placeholder="0,00"
                                />
                              </td>
                            )
                          })}

                          <td><b>{currency(total)}</b></td>

                          <td>
                            {canEdit && editExpensesMode ? (
                              <button className="btn red" onClick={() => removeCategory(cat)}>
                                Remover
                              </button>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      )
                    })}

                    <tr className="bg-green">
                      <td><b>Total</b></td>

                      {months.map((month) => (
                        <td key={month}>
                          {currency(
                            data.categories.reduce((s, cat) => {
                              return s + Number(data.expenses[cat]?.[month] || 0)
                            }, 0)
                          )}
                        </td>
                      ))}

                      <td><b>{currency(summary.despesasAno)}</b></td>
                      <td>—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {canEdit && (
            <button
              onClick={sendWhatsAppReport}
              title="Enviar relatório"
              style={{
                position: 'fixed',
                right: 18,
                bottom: 18,
                width: 54,
                height: 54,
                borderRadius: '50%',
                border: 'none',
                background: '#16a34a',
                color: '#fff',
                fontSize: 24,
                fontWeight: 900,
                boxShadow: '0 10px 24px rgba(22, 163, 74, 0.35)',
                zIndex: 999,
                cursor: 'pointer'
              }}
            >
              📊
            </button>
          )}

          <div className="note" style={{ textAlign: 'center', paddingBottom: 12 }}>
            {saving ? 'Salvando...' : 'Dados online pelo Supabase.'}
          </div>
        </div>
      </div>
    </div>
  )
}

function Metric({ title, value, highlight }) {
  return (
    <div className={'metric ' + (highlight ? 'highlight' : '')}>
      <div className="metric-title">{title}</div>
      <div className="metric-value">{value}</div>
    </div>
  )
}
