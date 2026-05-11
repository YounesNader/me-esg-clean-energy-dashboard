import { memo, useState } from 'react'

const FLAGS = {
  'Saudi Arabia': '🇸🇦', UAE: '🇦🇪', Qatar: '🇶🇦', Kuwait: '🇰🇼',
  Oman: '🇴🇲', Egypt: '🇪🇬', Bahrain: '🇧🇭', Jordan: '🇯🇴',
}

const COLS = [
  { key: 'country',                        label: 'Country',      fmt: (v) => v,                              align: 'left'  },
  { key: 'total_esg_budget_usd_million',   label: 'Total Budget', fmt: (v) => `$${(v/1000).toFixed(2)}B`,    align: 'right' },
  { key: 'avg_esg_score',                  label: 'ESG Score',    fmt: (v) => v?.toFixed(1),                 align: 'right' },
  { key: 'total_re_investment_usd_million',label: 'RE Invest',    fmt: (v) => `$${(v/1000).toFixed(2)}B`,    align: 'right' },
  { key: 'avg_policy_index',               label: 'Policy Idx',   fmt: (v) => v?.toFixed(1),                 align: 'right' },
]

const SortIcon = ({ dir }) => (
  <span style={{ marginLeft: 4, opacity: dir ? 1 : 0.3, fontSize: 9 }}>
    {dir === 'asc' ? '▲' : dir === 'desc' ? '▼' : '◆'}
  </span>
)

const DataTable = memo(function DataTable({ summaries = [] }) {
  const [sortKey, setSortKey]   = useState('total_esg_budget_usd_million')
  const [sortDir, setSortDir]   = useState('desc')

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const sorted = [...summaries].sort((a, b) => {
    const va = a[sortKey]; const vb = b[sortKey]
    if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    return sortDir === 'asc' ? va - vb : vb - va
  })

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 9, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)',
              borderBottom: '1px solid var(--border)' }}>
              #
            </th>
            {COLS.map((c) => (
              <th
                key={c.key}
                onClick={() => handleSort(c.key)}
                style={{ textAlign: c.align, cursor: 'pointer' }}
              >
                {c.label}
                <SortIcon dir={sortKey === c.key ? sortDir : null} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, idx) => (
            <tr key={row.country}>
              <td style={{ color: 'var(--text-muted)', fontFamily: '"IBM Plex Mono", monospace', fontSize: 11 }}>
                {idx + 1}
              </td>
              {COLS.map((c) => (
                <td
                  key={c.key}
                  style={{
                    textAlign: c.align,
                    color: c.key === 'country' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: c.key === 'country' ? 500 : 400,
                    fontFamily: c.key === 'country' ? '"IBM Plex Sans", sans-serif' : '"IBM Plex Mono", monospace',
                  }}
                >
                  {c.key === 'country' && (
                    <span style={{ marginRight: 6 }}>{FLAGS[row[c.key]] || ''}</span>
                  )}
                  {c.fmt(row[c.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
})

export default DataTable
