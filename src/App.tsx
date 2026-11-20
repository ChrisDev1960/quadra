
import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from './lib/supabase'

type AuthMode = 'home' | 'login' | 'signup' | 'forgot'
type Tab = 'overview' | 'play' | 'wallet' | 'activity' | 'referrals' | 'profile'

function App() {
  const [mode, setMode] = useState<AuthMode>('home')
  const [tab, setTab] = useState<Tab>('overview')
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem('quadra-theme') === 'dark'
  )
  const [userEmail, setUserEmail] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light'
    localStorage.setItem('quadra-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setLoggedIn(true)
        setUserEmail(data.session.user.email || '')
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setLoggedIn(!!session)
        setUserEmail(session?.user.email || '')
      }
    )

    return () => listener.subscription.unsubscribe()
  }, [])

  const resetForm = (nextMode: AuthMode) => {
    setMode(nextMode)
    setMessage('')
    setPassword('')
    setConfirmPassword('')
  }

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage('')

    if (mode === 'signup' && password !== confirmPassword) {
      setMessage('Your passwords do not match.')
      return
    }

    if (password.length < 8 && mode !== 'forgot') {
      setMessage('Password must contain at least 8 characters.')
      return
    }

    setLoading(true)

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin }
        })

        if (error) throw error

        if (data.session) {
          setLoggedIn(true)
          setUserEmail(data.user?.email || email)
          setTab('overview')
        }

        setMessage(
          data.session
            ? 'Your QUADRA account has been created.'
            : 'Account created. Check your email for confirmation.'
        )
      }

      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        })

        if (error) throw error

        setLoggedIn(true)
        setUserEmail(data.user.email || email)
        setTab('overview')
      }

      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin
        })

        if (error) throw error
        setMessage('Password recovery instructions have been sent.')
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Something went wrong.'
      )
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setLoggedIn(false)
    setUserEmail('')
    setTab('overview')
    setMode('home')
  }

  const toggleTheme = () => setDarkMode(!darkMode)

  const navItems: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'play', label: 'Four Cups' },
    { id: 'wallet', label: 'Wallet' },
    { id: 'activity', label: 'Activity' },
    { id: 'referrals', label: 'Referrals' },
    { id: 'profile', label: 'Profile' }
  ]

  if (loggedIn) {
    return (
      <main className="dashboard-shell">
        <header className="dashboard-header">
          <a className="brand" href="#" onClick={() => setTab('overview')}>
            QUADRA<span>.</span>
          </a>

          <div className="dashboard-header-actions">
            <button className="login-button" onClick={toggleTheme}>
              {darkMode ? '☀ Light' : '☾ Dark'}
            </button>
            <button className="login-button" onClick={logout}>
              Log out
            </button>
          </div>
        </header>

        <div className="dashboard-content">
          <div className="dashboard-welcome">
            <span className="section-label">YOUR QUADRA SPACE</span>
            <h1>Welcome back.</h1>
            <p>{userEmail}</p>
          </div>

          <section className="wallet-card">
            <span>AVAILABLE BALANCE</span>
            <h2>$0.00 <small>USD</small></h2>
            <p>Your wallet balance will appear here.</p>
            <div className="wallet-actions">
              <button onClick={() => setTab('wallet')}>Wallet details</button>
              <button onClick={() => setTab('activity')}>Transactions</button>
            </div>
          </section>

          <nav className="dashboard-nav">
            {navItems.map((item) => (
              <button
                key={item.id}
                className={tab === item.id ? 'dashboard-nav-active' : ''}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {tab === 'overview' && (
            <section className="dashboard-panel">
              <span className="section-label">YOUR OVERVIEW</span>
              <h2>Everything in one place.</h2>
              <p>Manage your account and explore the QUADRA experience.</p>

              <div className="dashboard-grid">
                <button onClick={() => setTab('play')}>
                  <span>01</span>
                  <strong>Four Cups</strong>
                  <small>Explore the game</small>
                </button>
                <button onClick={() => setTab('wallet')}>
                  <span>02</span>
                  <strong>My Wallet</strong>
                  <small>View USD balance</small>
                </button>
                <button onClick={() => setTab('activity')}>
                  <span>03</span>
                  <strong>Activity</strong>
                  <small>View transaction history</small>
                </button>
                <button onClick={() => setTab('referrals')}>
                  <span>04</span>
                  <strong>Referrals</strong>
                  <small>Your referral space</small>
                </button>
              </div>
            </section>
          )}

          {tab === 'play' && (
            <section className="dashboard-panel">
              <span className="section-label">THE QUADRA EXPERIENCE</span>
              <h2>Four cups. One choice.</h2>
              <p>
                Explore the four-cup interface. Real-money gameplay is not
                available yet.
              </p>

              <div className="dashboard-cups">
                {[1, 2, 3, 4].map((cup) => (
                  <div className="dashboard-cup" key={cup}>
                    <div className="cup">
                      <div className="cup-rim"></div>
                      <div className="cup-body">
                        <div className="cup-detail"></div>
                      </div>
                      <div className="cup-base"></div>
                    </div>
                    <span>0{cup}</span>
                  </div>
                ))}
              </div>

              <div className="notice">
                Game access is being prepared. No deposits, stakes or payouts
                are currently enabled.
              </div>
            </section>
          )}

          {tab === 'wallet' && (
            <section className="dashboard-panel">
              <span className="section-label">YOUR WALLET</span>
              <h2>USD wallet</h2>
              <div className="wallet-balance-small">$0.00 USD</div>
              <p>Your wallet is not yet connected to deposit or withdrawal services.</p>
              <div className="notice">
                Deposits and withdrawals will become available only after
                payment and compliance systems are approved.
              </div>
            </section>
          )}

          {tab === 'activity' && (
            <section className="dashboard-panel">
              <span className="section-label">ACCOUNT RECORDS</span>
              <h2>Recent activity</h2>
              <div className="empty-state">
                <span>—</span>
                <strong>No activity yet</strong>
                <p>Your account activity will appear here.</p>
              </div>
            </section>
          )}

          {tab === 'referrals' && (
            <section className="dashboard-panel">
              <span className="section-label">GROW WITH QUADRA</span>
              <h2>Your referrals</h2>
              <div className="referral-stat">
                <strong>0</strong>
                <span>People referred</span>
              </div>
              <p>Your referral link and rewards will appear here when the referral system is connected.</p>
            </section>
          )}

          {tab === 'profile' && (
            <section className="dashboard-panel">
              <span className="section-label">ACCOUNT SETTINGS</span>
              <h2>Your profile</h2>
              <div className="profile-detail">
                <span>Email address</span>
                <strong>{userEmail}</strong>
              </div>
              <div className="profile-detail">
                <span>Account currency</span>
                <strong>USD</strong>
              </div>
              <button className="logout-action" onClick={logout}>Log out of QUADRA</button>
            </section>
          )}
        </div>

        <footer>
          <span className="brand">QUADRA<span>.</span></span>
          <span>© 2026 QUADRA</span>
        </footer>
      </main>
    )
  }

  const isAuth = mode !== 'home'

  return (
    <main className="app-shell">
      <header className="navbar">
        <a className="brand" href="#" onClick={() => resetForm('home')}>
          QUADRA<span>.</span>
        </a>

        <nav>
          <a href="#experience">Experience</a>
          <a href="#about">About</a>
        </nav>

        <div className="nav-actions">
          <button className="login-button" onClick={toggleTheme}>
            {darkMode ? '☀ Light mode' : '☾ Dark mode'}
          </button>
          <button className="login-button" onClick={() => resetForm('login')}>
            Log in
          </button>
          <button className="nav-button" onClick={() => resetForm('signup')}>
            Create account <span>↗</span>
          </button>
        </div>
      </header>

      {isAuth ? (
        <section className="auth-section">
          <div className="auth-card">
            <span className="section-label">WELCOME TO QUADRA</span>
            <h1>
              {mode === 'login' && 'Welcome back.'}
              {mode === 'signup' && 'Create your account.'}
              {mode === 'forgot' && 'Reset your password.'}
            </h1>
            <p className="auth-description">
              {mode === 'login' && 'Sign in to continue your QUADRA experience.'}
              {mode === 'signup' && 'A new experience begins with your account.'}
              {mode === 'forgot' && 'Enter your email to receive password recovery instructions.'}
            </p>

            <form onSubmit={handleAuth}>
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />

              {mode !== 'forgot' && (
                <>
                  <label htmlFor="password">Password</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    minLength={8}
                    required
                  />
                </>
              )}

              {mode === 'signup' && (
                <>
                  <label htmlFor="confirm-password">Confirm password</label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Enter your password again"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </>
              )}

              {mode === 'login' && (
                <button
                  type="button"
                  className="forgot-link"
                  onClick={() => resetForm('forgot')}
                >
                  Forgot password?
                </button>
              )}

              <button className="primary-button auth-submit" disabled={loading}>
                {loading ? 'Please wait...' : mode === 'login' ? 'Log in' : mode === 'signup' ? 'Create account' : 'Send recovery email'}
                <span>↗</span>
              </button>

              {message && <p className="auth-message" role="status">{message}</p>}
            </form>

            <div className="auth-switch">
              {mode === 'login' ? (
                <>New to QUADRA? <button onClick={() => resetForm('signup')}>Create an account</button></>
              ) : (
                <>Already have an account? <button onClick={() => resetForm('login')}>Log in</button></>
              )}
            </div>

            <button className="back-home" onClick={() => resetForm('home')}>
              ← Back to homepage
            </button>
          </div>
        </section>
      ) : (
        <>
          <section className="hero" id="experience">
            <div className="eyebrow">
              <span className="status-dot"></span>
              A NEW KIND OF GAMING EXPERIENCE
            </div>
            <h1>Four cups.<br /><span>Infinite possibilities.</span></h1>
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
                    <div className="cup-body"><div className="cup-detail"></div></div>
                    <div className="cup-base"></div>
                  </div>
                  <span className="cup-label">0{cup}</span>
                </div>
              ))}
            </div>
            <button className="primary-button" onClick={() => resetForm('signup')}>
              Get started <span>↗</span>
            </button>
            <p className="hero-note">FOUR CUPS · ONE DISTINCT EXPERIENCE</p>
          </section>

          <section className="about-section" id="about">
            <span className="section-label">THE QUADRA PHILOSOPHY</span>
            <h2>Less noise. More anticipation.</h2>
            <p>Four identical cups. A beautifully simple concept. An experience designed with intention.</p>
          </section>
        </>
      )}

      <footer>
        <span className="brand">QUADRA<span>.</span></span>
        <span>© 2026 QUADRA</span>
      </footer>
    </main>
  )
}

export default App
