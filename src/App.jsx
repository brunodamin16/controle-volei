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

/* ===== MONEY HELPERS ===== */

function cleanTyping(v) {
  return String(v)
    .replace(/[^\d,]/g, '')
    .replace(/(,.*),/g, '$1')
}

function parseMoney(v) {
  if (!v) return 0
  return Number(v.replace(',', '.')) || 0
}

function formatMoney(v) {
  const n = Number(v || 0)
  if (n === 0) return ''
  return n.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function currency(v) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(v || 0))
}

/* ===== STRUCTURE ===== */

function createPayments(players) {
  const d = {}
  players.forEach(p => {
    d[p] = {}
    months.forEach(m => d[p][m] = 0)
  })
  return d
}

function createExpenses(cats) {
  const d = {}
  cats.forEach(c => {
    d[c] = {}
    months.forEach(m => d[c][m] = 0)
  })
  return d
}

function defaultState() {
  return {
    appTitle: 'Controle Financeiro · Time de Vôlei',
    players: initialPlayers,
    categories: initialCategories,
    fees: initialFees,
    payments: createPayments(initialPlayers),
    expenses: createExpenses(initialCategories)
  }
}

/* ===== APP ===== */

export default function App() {
  const [data, setData] = useState(defaultState)

  const [session, setSession] = useState(null)
  const [role, setRole] = useState('viewer')
  const [loginScreen, setLoginScreen] = useState(false)

  const [editingTitle, setEditingTitle] = useState(false)
  const [tempTitle, setTempTitle] = useState('')

  const [editingInput, setEditingInput] = useState(null)

  const canEdit = role === 'admin'

  /* ===== AUTH ===== */

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })
  }, [])

  function logout() {
    supabase.auth.signOut()
    setRole('viewer')
  }

  /* ===== TITLE ===== */

  function startEditTitle() {
    setTempTitle(data.appTitle)
    setEditingTitle(true)
  }

  function saveTitle() {
    setData({ ...data, appTitle: tempTitle })
    setEditingTitle(false)
  }

  /* ===== INPUT CONTROL ===== */

  function handleMoneyChange(setter, value) {
    setter(cleanTyping(value))
  }

  function handleMoneyBlur(setter, value) {
    setter(parseMoney(value))
    setEditingInput(null)
  }

  /* ===== UI ===== */

  return (
    <div style={{ padding: 12 }}>

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
              <h3 style={{ margin: 0 }}>{data.appTitle}</h3>

              {canEdit && (
                <span onClick={startEditTitle} style={{ cursor: 'pointer' }}>
                  ✏️
                </span>
              )}
            </>
          ) : (
            <>
              <input
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
              />
              <button onClick={saveTitle}>Salvar</button>
            </>
          )}
        </div>

        {!session ? (
          <button onClick={() => setLoginScreen(true)}>🔒 Login</button>
        ) : (
          <button onClick={logout}>Sair</button>
        )}
      </div>

      {/* TABLE */}
      <div style={{ marginTop: 20, overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Jogadora</th>
              {months.map(m => <th key={m}>{m}</th>)}
            </tr>
          </thead>

          <tbody>
            {data.players.map(player => (
              <tr key={player}>
                <td>{player}</td>

                {months.map(month => {
                  const key = player + month
                  const value = data.payments[player][month]

                  return (
                    <td key={month}>
                      {editingInput === key ? (
                        <input
                          value={formatMoney(value)}
                          onChange={(e) =>
                            handleMoneyChange(
                              (v) => {
                                const next = { ...data }
                                next.payments[player][month] = v
                                setData(next)
                              },
                              e.target.value
                            )
                          }
                          onBlur={(e) =>
                            handleMoneyBlur(
                              (v) => {
                                const next = { ...data }
                                next.payments[player][month] = v
                                setData(next)
                              },
                              e.target.value
                            )
                          }
                          autoFocus
                        />
                      ) : (
                        <div onClick={() => canEdit && setEditingInput(key)}>
                          {currency(value)}
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  )
}
