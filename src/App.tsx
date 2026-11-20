
import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from './lib/supabase'

type AuthMode = 'home' | 'login' | 'signup' | 'forgot'

function App() {
  const [mode, setMode] = useState<AuthMode>('home')
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem('quadra-theme') === 'dark'
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light'
    localStorage.setItem('quadra-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

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
      setMessage('Your password must contain at least 8 characters.')
      return
    }

    setLoading(true)

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin
          }
        })

        if (error) throw error

        setMessage(
          data.session
            ? 'Your QUADRA account has been created.'
            : 'Account created. Please check your email to confirm your account.'
        )
      }

      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        })

        if (error) throw error

        setMessage('Login successful. Your account is authenticated.')
      }

      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin
        })

        if (error) throw error

        setMessage('Password recovery instructions have been sent to your email.')
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.'
      )
    } finally {
      setLoading(false)
    }
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
          <button
            className="login-button"
            onClick={() => setDarkMode(!darkMode)}
          >
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
                {loading
                  ? 'Please wait...'
                  : mode === 'login'
                    ? 'Log in'
                    : mode === 'signup'
                      ? 'Create account'
                      : 'Send recovery email'}
                <span>↗</span>
              </button>

              {message && (
                <p className="auth-message" role="status">
                  {message}
                </p>
              )}
            </form>

            <div className="auth-switch">
              {mode === 'login' ? (
                <>
                  New to QUADRA?{' '}
                  <button onClick={() => resetForm('signup')}>Create an account</button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button onClick={() => resetForm('login')}>Log in</button>
                </>
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
                  <span className="cup-label">0{cup}</span>
                </div>
              ))}
            </div>

            <button className="primary-button" onClick={() => resetForm('signup')}>
              Get started <span>↗</span>
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
