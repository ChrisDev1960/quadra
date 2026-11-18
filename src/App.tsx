
function App() {
  const explore = () => {
    document.getElementById('experience')?.scrollIntoView({
      behavior: 'smooth'
    })
  }

  return (
    <main className="app-shell">
      <header className="navbar">
        <a className="brand" href="#">QUADRA<span>.</span></a>

        <nav>
          <a href="#experience">Experience</a>
          <a href="#about">About</a>
        </nav>

        <button className="nav-button" onClick={explore}>
          Explore <span>↗</span>
        </button>
      </header>

      <section className="hero" id="experience">
        <div className="eyebrow">
          <span className="status-dot"></span>
          A NEW KIND OF GAMING EXPERIENCE
        </div>

        <h1>
          Four cups.
          <br />
          <span>Infinite possibilities.</span>
        </h1>

        <p className="hero-description">
          A refined gaming experience built around simplicity,
          anticipation and the art of the unexpected.
        </p>

        <div className="cup-stage">
          {[1, 2, 3, 4].map((cup) => (
            <div className="cup-item" key={cup}>
              <div className="cup-shadow"></div>
              <div className="cup">
                <div className="cup-rim"></div>
                <div className="cup-body">
                  <div className="cup-detail"></div>
                </div>
                <div className="cup-base"></div>
              </div>
              <span className="cup-label">
                0{cup}
              </span>
            </div>
          ))}
        </div>

        <button className="primary-button" onClick={explore}>
          Discover QUADRA <span>↗</span>
        </button>

        <p className="hero-note">
          FOUR CUPS · ONE DISTINCT EXPERIENCE
        </p>
      </section>

      <section className="about-section" id="about">
        <span className="section-label">THE QUADRA PHILOSOPHY</span>
        <h2>Less noise. More anticipation.</h2>
        <p>
          Four identical cups. A beautifully simple concept.
          An experience designed with intention.
        </p>
      </section>

      <footer>
        <span className="brand">QUADRA<span>.</span></span>
        <span>© 2026 QUADRA</span>
      </footer>
    </main>
  )
}

export default App
