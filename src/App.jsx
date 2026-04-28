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

/* ===== MONEY ===== */

function currency(v) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(v || 0))
}

function formatMoneyInput(v) {
  const n = Number(v || 0)
  if (n === 0) return ''
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

function clean(v) {
  return String(v || '').replace(/[^\d,]/g, '').replace(/(,.*),/g, '$1')
}

function parse(v) {
  if (!v) return 0
  return Number(v.replace(',', '.')) || 0
}

/* ===== STRUCT ===== */

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
  const [draft, setDraft] = useState({})

  const canEdit = role === 'admin'

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })
  }, [])

  /* ===== SUMMARY ===== */

  const summary = useMemo(() => {
    let caixa = 0

    const monthly = months.map((m) => {
      const arrecadado = data.players.reduce((s, p) =>
        s + Number(data.payments[p]?.[m] || 0), 0)

      const gastos = data.categories.reduce((s, c) =>
        s + Number(data.expenses[c]?.[m] || 0), 0)

      const resultado = arrecadado - gastos
      caixa += resultado

      const pagos = data.players.filter(p =>
        Number(data.payments[p]?.[m] || 0) > 0).length

      return { m, arrecadado, gastos, resultado, caixa, pagos }
    })

    return { monthly, caixa }
  }, [data])

  /* ===== WHATS ===== */

  function sendWhatsAppReport() {
    if (!canEdit) return

    const now = new Date()
    const date = now.toLocaleDateString('pt-BR')

    const idx = now.getMonth() === 0 ? 11 : now.getMonth() - 1
    const month = months[idx]
    const m = summary.monthly[idx]

    const totalPlayers = data.players.length
    const paid = m.pagos
    const percent = totalPlayers
      ? ((paid / totalPlayers) * 100).toFixed(0)
      : 0

    const message = `
🏐 ${data.appTitle}

📅 Data: ${date}

💰 Caixa atual: ${currency(summary.caixa)}
📈 Arrecadado no mês: ${currency(m.arrecadado)}
💸 Gastos no mês: ${currency(m.gastos)}
✅ Pagamentos lançados em ${month}: ${paid}/${totalPlayers} jogadoras (${percent}%)

📊 Balanço geral de ${month}:
${month}: Arrecadado ${currency(m.arrecadado)} | Gastos ${currency(m.gastos)} | ${paid}/${totalPlayers} jogadoras (${percent}%) | Caixa ${currency(m.caixa)}

Enviado pelo app de controle do time
`

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`)
  }

  /* ===== UI ===== */

  return (
    <div style={{ padding: 12 }}>

      <h2>{data.appTitle}</h2>

      {/* FLOAT BUTTON (ADMIN ONLY) */}
      {canEdit && (
        <button
          onClick={sendWhatsAppReport}
          style={{
            position: 'fixed',
            right: 18,
            bottom: 18,
            width: 56,
            height: 56,
            borderRadius: '50%',
            border: 'none',
            background: '#16a34a',
            color: '#fff',
            fontSize: 22,
            boxShadow: '0 10px 20px rgba(0,0,0,0.3)',
            cursor: 'pointer'
          }}
        >
          📊
        </button>
      )}

    </div>
  )
}
