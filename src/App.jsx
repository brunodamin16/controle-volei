import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseClient'

const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const initialPlayers = ['ALINE','ANA','BABI','BRUNA','FLAVIA','MARI']
const initialCategories = ['Quadra','Campeonato','Uniforme','Outros']

function currency(v) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(v || 0))
}

/* ===== MONEY ===== */

function clean(v) {
  return String(v).replace(/[^\d,]/g, '').replace(/(,.*),/g, '$1')
}

function parse(v) {
  if (!v) return 0
  return Number(v.replace(',', '.')) || 0
}

function format(v) {
  const n = Number(v || 0)
  if (n === 0) return ''
  return n.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

/* ===== APP ===== */

export default function App() {

  const [data, setData] = useState({
    appTitle: 'Controle Financeiro · Time de Vôlei',
    players: initialPlayers,
    categories: initialCategories,
    fees: {},
    payments: {},
    expenses: {}
  })

  const [session, setSession] = useState(null)
  const [role, setRole] = useState('viewer')
  const [editingTitle, setEditingTitle] = useState(false)
  const [tempTitle, setTempTitle] = useState('')

  const [draft, setDraft] = useState({})

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

  /* ===== MONEY INPUT ===== */

  function start(key, value) {
    setDraft({ ...draft, [key]: value ? String(value).replace('.', ',') : '' })
  }

  function change(key, value) {
    setDraft({ ...draft, [key]: clean(value) })
  }

  function end(key, setter) {
    setter(parse(draft[key]))
    const copy = { ...draft }
    delete copy[key]
    setDraft(copy)
  }

  /* ===== SUMMARY ===== */

  const summary = useMemo(() => {
    let total = 0

    months.forEach(m => {
      data.players.forEach(p => {
        total += Number(data.payments?.[p]?.[m] || 0)
      })

      data.categories.forEach(c => {
        total -= Number(data.expenses?.[c]?.[m] || 0)
      })
    })

    return { total }
  }, [data])

  /* ===== WHATSAPP ===== */

  function sendWhatsApp() {
    const now = new Date()

    const message = `
🏐 *Relatório do Time*

📅 ${now.toLocaleDateString('pt-BR')}
⏰ ${now.toLocaleTimeString('pt-BR')}

💰 Caixa: ${currency(summary.total)}
`

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
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
        justifyContent: 'space-between'
      }}>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {!editingTitle ? (
            <>
              <h3>{data.appTitle}</h3>

              {canEdit && (
                <span onClick={startEditTitle} style={{ cursor: 'pointer' }}>
                  ✏️
                </span>
              )}
            </>
          ) : (
            <>
              <input value={tempTitle} onChange={e => setTempTitle(e.target.value)} />
              <button onClick={saveTitle}>Salvar</button>
            </>
          )}
        </div>

        {session && <button onClick={logout}>Sair</button>}
      </div>

      {/* WHATSAPP */}
      <div style={{ marginTop: 20 }}>
        <button
          onClick={sendWhatsApp}
          style={{
            width: '100%',
            padding: 14,
            background: '#16a34a',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontSize: 16
          }}
        >
          🟢 Enviar relatório no WhatsApp
        </button>
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
                  const value = data.payments?.[player]?.[month] || 0

                  return (
                    <td key={month}>
                      <input
                        value={draft[key] ?? format(value)}
                        onFocus={() => start(key, value)}
                        onChange={e => change(key, e.target.value)}
                        onBlur={() =>
                          end(key, (v) => {
                            const next = { ...data }
                            if (!next.payments[player]) next.payments[player] = {}
                            next.payments[player][month] = v
                            setData(next)
                          })
                        }
                      />
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
