import { useState } from 'react'

export default function App() {
  const [count, setCount] = useState(0)

  return (
    <main>
      <header className="brand"><span aria-hidden="true">◒</span> webapp starter</header>
      <section aria-labelledby="intro-title">
        <p className="eyebrow">A small beginning</p>
        <h1 id="intro-title">Make something useful.</h1>
        <p className="intro">A little structure. Room for your idea. Your next app starts here.</p>
      </section>
      <section className="demo" aria-labelledby="demo-title">
        <div className="demo-heading">
          <h2 id="demo-title">One small interaction</h2>
          <span className="badge">Ready to build</span>
        </div>
        <p className="count" role="status" aria-live="polite" aria-atomic="true">
          <strong>{count}</strong> {count === 1 ? 'step' : 'steps'} forward
        </p>
        <div className="actions">
          <button onClick={() => setCount((value) => value + 1)}>Take a step <span aria-hidden="true">↗</span></button>
          <button className="secondary" onClick={() => setCount(0)} disabled={count === 0}>Reset</button>
        </div>
      </section>
      <footer>Small by design. Yours to make.</footer>
    </main>
  )
}
