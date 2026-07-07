'use client'

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html>
      <body style={{ margin: 0, background: '#0c0c0c', color: '#f5f5f5', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Что-то пошло не так</p>
          <p style={{ fontSize: '0.75rem', color: '#888', marginBottom: '1.5rem' }}>Попробуйте обновить страницу</p>
          <button onClick={reset} style={{ padding: '0.5rem 1.25rem', borderRadius: '0.75rem', border: '1px solid #333', background: 'transparent', color: '#f5f5f5', cursor: 'pointer', fontSize: '0.875rem' }}>
            Попробовать снова
          </button>
        </div>
      </body>
    </html>
  )
}
