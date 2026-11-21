
import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from './lib/supabase'

const QUADRA_DEPOSIT_ADDRESS = '0xe801e50631c03a1aaf2d30bb1f2f196864db58a5'
const SUPPORTED_NETWORKS = ['Ethereum (ERC20)', 'BNB Smart Chain (BEP20)']

type AuthMode = 'home' | 'login' | 'signup' | 'forgot'
type Tab = 'overview' | 'play' | 'wallet' | 'activity' | 'referrals' | 'profile' | 'admin'
type WalletPage = 'main' | 'deposit' | 'withdraw'

type Transaction = {
  id: string
  type: string
  amount: number
  status: string
  description: string | null
  created_at: string
}

type Deposit = {
  id: string
  user_id: string
  amount: number
  network: string | null
  payment_reference: string | null
  status: string
  admin_note: string | null
  created_at: string
}

type Withdrawal = {
  id: string
  user_id: string
  amount: number
  network: string
  destination_address: string
  status: string
  admin_note: string | null
  transaction_hash: string | null
  created_at: string
}

type AdminUser = {
  id: string
  email: string
  created_at: string
}

type AutoSettings = {
  stake: string
  rounds: string
  stopProfit: string
  stopLoss: string
  stopOnWin: boolean
  stopOnLoss: boolean
}

const defaultAutoSettings: AutoSettings = {
  stake: '1.00',
  rounds: '10',
  stopProfit: '5.00',
  stopLoss: '5.00',
  stopOnWin: false,
  stopOnLoss: false
}

function App() {
  const [mode, setMode] = useState<AuthMode>('home')
  const [tab, setTab] = useState<Tab>('overview')
  const [walletPage, setWalletPage] = useState<WalletPage>('main')

  const [userEmail, setUserEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  const [balance, setBalance] = useState(0)
  const [currency, setCurrency] = useState('USD')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [walletLoading, setWalletLoading] = useState(false)
  const [walletMessage, setWalletMessage] = useState('')

  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminMessage, setAdminMessage] = useState('')
  const [adminNote, setAdminNote] = useState('')
  const [payoutHashes, setPayoutHashes] = useState<Record<string, string>>({})

  const [depositAmount, setDepositAmount] = useState('')
  const [depositReference, setDepositReference] = useState('')
  const [depositNetwork, setDepositNetwork] = useState('Ethereum (ERC20)')
  const [depositCopyMessage, setDepositCopyMessage] = useState('')

  const [withdrawalAmount, setWithdrawalAmount] = useState('')
  const [withdrawalAddress, setWithdrawalAddress] = useState('')
  const [withdrawalNetwork, setWithdrawalNetwork] = useState('Ethereum (ERC20)')
  const [walletActionLoading, setWalletActionLoading] = useState(false)

  const [autoSettings, setAutoSettings] = useState<AutoSettings>(() => {
    try {
      const saved = localStorage.getItem('quadra-auto-settings')
      return saved ? { ...defaultAutoSettings, ...JSON.parse(saved) } : defaultAutoSettings
    } catch {
      return defaultAutoSettings
    }
  })
  const [autoSettingsMessage, setAutoSettingsMessage] = useState('')
const [practiceStake, setPracticeStake] = useState('1.00')
const [practiceRoundId, setPracticeRoundId] = useState('')
const [practiceBusy, setPracticeBusy] = useState(false)
const [practiceMessage, setPracticeMessage] = useState('')
const [practiceResult, setPracticeResult] = useState<'won' | 'lost' | ''>('')
const [practicePayout, setPracticePayout] = useState(0)
const [selectedPracticeTile, setSelectedPracticeTile] = useState<number | null>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

const startPracticeRound = async () => {
  const stake = Number(practiceStake)

  if (!Number.isFinite(stake) || stake <= 0 || stake > balance) {
    setPracticeMessage('Enter a valid stake within your available balance.')
    return
  }

  setPracticeBusy(true)
  setPracticeMessage('Starting round...')
  setPracticeResult('')
  setPracticePayout(0)
  setSelectedPracticeTile(null)

  const { data, error } = await supabase.rpc('start_mines_practice', {
    p_stake: stake,
  })

  if (error) {
    setPracticeMessage(error.message)
  } else {
    setPracticeRoundId(data)
    await loadAccountData(userId)
    setPracticeMessage('Round started. Choose one tile.')
  }

  setPracticeBusy(false)
}

const selectPracticeTile = async (tile: number) => {
  if (!practiceRoundId || practiceBusy || practiceResult) return

  setPracticeBusy(true)
  setSelectedPracticeTile(tile)

  const { data, error } = await supabase.rpc('select_mines_practice_tile', {
    p_round_id: practiceRoundId,
    p_selected_tile: tile,
  })

  if (error) {
    setPracticeMessage(error.message)
    setSelectedPracticeTile(null)
  } else {
    const result = Array.isArray(data) ? data[0] : data

    setPracticeResult(result.round_status)
    setPracticePayout(Number(result.payout))

    await loadAccountData(userId)

    setPracticeMessage(
      result.round_status === 'won'
        ? `You won $${Number(result.payout).toFixed(2)}!`
        : 'Not this time. Your stake was lost.',
    )

    setPracticeRoundId('')
  }

  setPracticeBusy(false)
}

  const loadAccountData = async (id: string) => {
    setWalletLoading(true)
    setWalletMessage('')

    try {
      const [walletResult, transactionResult, adminResult] = await Promise.all([
        supabase.from('wallets').select('balance, currency').eq('user_id', id).maybeSingle(),
        supabase.from('wallet_transactions')
          .select('id, type, amount, status, description, created_at')
          .eq('user_id', id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase.rpc('is_quadra_admin')
      ])

      if (walletResult.error) throw walletResult.error
      if (transactionResult.error) throw transactionResult.error

      if (!walletResult.data) {
        setBalance(0)
        setWalletMessage('Your wallet is being prepared. Please refresh shortly.')
      } else {
        setBalance(Number(walletResult.data.balance))
        setCurrency(walletResult.data.currency)
      }

      setTransactions(transactionResult.data || [])
      setIsAdmin(adminResult.data === true)

      if (adminResult.error) console.error('Admin check failed:', adminResult.error.message)
    } catch (error) {
      console.error('Account data error:', error)
      setWalletMessage(error instanceof Error ? error.message : 'Unable to load wallet data.')
    } finally {
      setWalletLoading(false)
    }
  }

  const loadAdminData = async () => {
    setAdminLoading(true)
    setAdminMessage('')

    try {
      const [depositResult, withdrawalResult, userResult] = await Promise.all([
        supabase.from('deposit_requests')
          .select('id,user_id,amount,network,payment_reference,status,admin_note,created_at')
          .order('created_at', { ascending: false }).limit(100),
        supabase.from('withdrawal_requests')
          .select('id,user_id,amount,network,destination_address,status,admin_note,transaction_hash,created_at')
          .order('created_at', { ascending: false }).limit(100),
        supabase.from('profiles')
          .select('id,email,created_at')
          .order('created_at', { ascending: false }).limit(100)
      ])

      if (depositResult.error) throw depositResult.error
      if (withdrawalResult.error) throw withdrawalResult.error
      if (userResult.error) throw userResult.error

      setDeposits(depositResult.data || [])
      setWithdrawals(withdrawalResult.data || [])
      setAdminUsers(userResult.data || [])
    } catch (error) {
      setAdminMessage(error instanceof Error ? error.message : 'Unable to load administrator data.')
    } finally {
      setAdminLoading(false)
    }
  }

  useEffect(() => {
    document.documentElement.dataset.theme = 'light'
    document.documentElement.style.colorScheme = 'light'
    localStorage.setItem('quadra-theme', 'light')
  }, [])

  useEffect(() => {
    localStorage.setItem('quadra-auto-settings', JSON.stringify(autoSettings))
  }, [autoSettings])

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      const session = data.session
      setLoggedIn(!!session)
      setUserId(session?.user.id || '')
      setUserEmail(session?.user.email || '')
      if (session?.user.id) loadAccountData(session.user.id)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return

      setLoggedIn(!!session)
      setUserId(session?.user.id || '')
      setUserEmail(session?.user.email || '')

      if (session?.user.id) {
        loadAccountData(session.user.id)
      } else {
        setBalance(0)
        setTransactions([])
        setIsAdmin(false)
        setDeposits([])
        setWithdrawals([])
        setAdminUsers([])
      }
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (loggedIn && isAdmin && tab === 'admin') loadAdminData()
  }, [loggedIn, isAdmin, tab])

  const resetForm = (nextMode: AuthMode) => {
    setMode(nextMode)
    setMessage('')
    setPassword('')
    setConfirmPassword('')
  }

  const navigate = (nextTab: Tab) => {
    setTab(nextTab)
    setWalletPage('main')
    setWalletMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openWalletPage = (page: WalletPage) => {
    setTab('wallet')
    setWalletPage(page)
    setWalletMessage('')
    setDepositCopyMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
          setUserId(data.user?.id || '')
          setUserEmail(data.user?.email || email)
          navigate('overview')
        }

        setMessage(data.session
          ? 'Your QUADRA account has been created.'
          : 'Account created. Check your email for confirmation.')
      }

      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error

        setLoggedIn(true)
        setUserId(data.user.id)
        setUserEmail(data.user.email || email)
        navigate('overview')
        await loadAccountData(data.user.id)
      }

      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin
        })
        if (error) throw error
        setMessage('Password recovery instructions have been sent.')
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const copyDepositAddress = async () => {
    try {
      await navigator.clipboard.writeText(QUADRA_DEPOSIT_ADDRESS)
      setDepositCopyMessage('Address copied successfully.')
    } catch {
      setDepositCopyMessage('Unable to copy automatically. Please select and copy the address.')
    }
  }

  const submitDeposit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setWalletActionLoading(true)
    setWalletMessage('')

    try {
      const amount = Number(depositAmount)
      if (!Number.isFinite(amount) || amount <= 0) throw new Error('Enter a valid deposit amount.')

      const hash = depositReference.trim()
      if (!/^0x[a-fA-F0-9]{64}$/.test(hash)) {
        throw new Error('Enter a valid EVM transaction hash beginning with 0x and containing 64 hexadecimal characters.')
      }

      if (!SUPPORTED_NETWORKS.includes(depositNetwork)) throw new Error('Select a supported deposit network.')

      const { error } = await supabase.from('deposit_requests').insert({
        user_id: userId,
        amount,
        network: depositNetwork,
        payment_reference: hash,
        status: 'pending'
      })
      if (error) throw error

      setWalletMessage('Deposit request submitted. It is awaiting administrator verification.')
      setDepositAmount('')
      setDepositReference('')
    } catch (error) {
      setWalletMessage(error instanceof Error ? error.message : 'Deposit request failed.')
    } finally {
      setWalletActionLoading(false)
    }
  }

  const submitWithdrawal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setWalletActionLoading(true)
    setWalletMessage('')

    try {
      const amount = Number(withdrawalAmount)
      if (!Number.isFinite(amount) || amount <= 0) throw new Error('Enter a valid withdrawal amount.')

      const address = withdrawalAddress.trim()
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        throw new Error('Enter a valid Ethereum or BNB Smart Chain wallet address.')
      }

      if (!SUPPORTED_NETWORKS.includes(withdrawalNetwork)) throw new Error('Select a supported withdrawal network.')

      const { error } = await supabase.rpc('request_quadra_withdrawal', {
        p_amount: amount,
        p_network: withdrawalNetwork,
        p_destination_address: address
      })
      if (error) throw error

      setWalletMessage('Withdrawal request submitted. Your funds are reserved while the request is reviewed.')
      setWithdrawalAmount('')
      setWithdrawalAddress('')
      await loadAccountData(userId)
    } catch (error) {
      setWalletMessage(error instanceof Error ? error.message : 'Withdrawal request failed.')
    } finally {
      setWalletActionLoading(false)
    }
  }

  const adminAction = async (rpcName: string, requestId: string, note?: string, hash?: string) => {
    setAdminMessage('Processing administrator action...')

    try {
      const args: Record<string, string> = { p_request_id: requestId }

      if (rpcName === 'mark_withdrawal_paid') {
        args.p_transaction_hash = hash || ''
      } else {
        args.p_admin_note = note || ''
      }

      const { error } = await supabase.rpc(rpcName, args)
      if (error) throw error

      setAdminMessage('Action completed successfully.')
      setAdminNote('')
      setPayoutHashes(prev => ({ ...prev, [requestId]: '' }))
      await loadAdminData()
      await loadAccountData(userId)
    } catch (error) {
      setAdminMessage(error instanceof Error ? error.message : 'Administrator action failed.')
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setLoggedIn(false)
    setUserEmail('')
    setUserId('')
    setBalance(0)
    setTransactions([])
    setIsAdmin(false)
    setTab('overview')
    setWalletPage('main')
    setMode('home')
  }

  const updateAutoSetting = <K extends keyof AutoSettings>(key: K, value: AutoSettings[K]) => {
    setAutoSettings(prev => ({ ...prev, [key]: value }))
    setAutoSettingsMessage('Settings saved on this device.')
  }

  const navItems: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Home' },
    { id: 'play', label: 'Mines' },
    { id: 'wallet', label: 'Wallet' },
    { id: 'activity', label: 'Activity' },
    { id: 'referrals', label: 'Referrals' },
    { id: 'profile', label: 'Profile' }
  ]

  const money = (amount: number) => '$' + Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })

  const displayName = userEmail.split('@')[0] || 'there'

  if (loggedIn) {
    return (
      <main className="dashboard-shell">
        <header className="dashboard-header">
          <a className="brand" href="#" onClick={e => { e.preventDefault(); navigate('overview') }}>
            QUADRA<span>.</span>
          </a>

          <div className="dashboard-header-actions">
            {(tab === 'overview' || tab === 'play') && (
              <button
                className="top-balance top-balance-compact"
                onClick={() => navigate('wallet')}
                aria-label={`Wallet balance ${money(balance)} ${currency}`}
              >
                <span>Balance</span>
                <strong>{money(balance)}</strong>
                <small>{currency}</small>
              </button>
            )}

            {isAdmin && <span className="admin-pill">ADMIN</span>}
          </div>
        </header>

        <nav className="dashboard-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={tab === item.id ? 'dashboard-nav-active' : ''}
              onClick={() => navigate(item.id)}
            >
              {item.label}
            </button>
          ))}
          {isAdmin && (
            <button className={tab === 'admin' ? 'dashboard-nav-active' : ''} onClick={() => navigate('admin')}>
              Admin
            </button>
          )}
        </nav>

        <div className="dashboard-content">
          {tab === 'overview' && (
            <>
              <div className="dashboard-topline">
                <div className="dashboard-welcome">
                  <h1>Welcome back, {displayName}.</h1>
                </div>
              </div>

              {walletMessage && <div className="notice" role="status">{walletMessage}</div>}

              <section className="game-feature-panel">
                <div className="game-feature-copy">
                  <span className="section-label">THE QUADRA GAME</span>
                  <h2>Find your moment.</h2>
                  <p>A refined Mines experience. Four tiles. One selection at a time.</p>
                  <button className="primary-button" onClick={() => navigate('play')}>Explore Mines</button>
                </div>
                <div className="mini-mines-grid" aria-hidden="true">
                  <div>✦</div><div></div><div></div><div></div>
                </div>
              </section>

              <section className="dashboard-panel overview-panel">
                <div className="panel-heading">
                  <div>
                    <span className="section-label">YOUR OVERVIEW</span>
                    <h2>Your QUADRA space.</h2>
                  </div>
                  <span className="soft-tag">ACCOUNT</span>
                </div>

                <div className="dashboard-grid">
                  <button onClick={() => navigate('play')}>
                    <span>01</span><strong>Mines</strong><small>Explore the game</small>
                  </button>
                  <button onClick={() => navigate('wallet')}>
                    <span>02</span><strong>My Wallet</strong><small>Manage your USD balance</small>
                  </button>
                  <button onClick={() => navigate('activity')}>
                    <span>03</span><strong>Activity</strong><small>View account records</small>
                  </button>
                  <button onClick={() => navigate('referrals')}>
                    <span>04</span><strong>Referrals</strong><small>Your referral space</small>
                  </button>
                </div>

                {isAdmin && (
                  <div className="notice">
                    Administrator access is active.
                    <button className="text-action" onClick={() => navigate('admin')}>Open management dashboard</button>
                  </div>
                )}
              </section>
            </>
          )}

         {tab === 'play' && (
  <section className="dashboard-panel mines-panel">
    <div className="panel-heading">
      <div>
        <span className="section-label">QUADRA ORIGINAL</span>
        <h2>Mines.</h2>
        <p>Four tiles. One selection per round.</p>
      </div>
      <span className="preview-tag">PRACTICE MODE</span>
    </div>

    <div className="game-status-row">
      <span>GAME BOARD</span>
      <span className="status-indicator"><i /> Virtual credits only</span>
    </div>

    <div className="control-summary">
      <span>AVAILABLE BALANCE</span>
      <strong>{money(Balance)}</strong>
    </div>

    <div className="mines-board-wrap">
      <div className="mines-board">
  {[0, 1, 2, 3].map(tile => (
    <button
      className={`mine-tile practice-tile ${
        selectedPracticeTile === tile
          ? `practice-tile-selected ${
              practiceResult === 'won'
                ? 'practice-tile-won'
                : practiceResult === 'lost'
                  ? 'practice-tile-lost'
                  : ''
            }`
          : ''
      }`}
      disabled={!practiceRoundId || practiceBusy || !!practiceResult}
      aria-label={`Tile ${tile + 1}`}
      key={tile}
      onClick={() => selectPracticeTile(tile)}
    >
      <span className="tile-symbol">
        {selectedPracticeTile === tile && practiceResult === 'lost'
          ? '✹'
          : '✦'}
      </span>

      {selectedPracticeTile === tile && practiceResult && (
        <span className="tile-result-multiplier">
          {practiceResult === 'won' ? '5.00x' : '0.00x'}
        </span>
      )}
    </button>
  ))}
</div>
    </div>

    <div className="game-controls-preview">
      <label className="control-summary">
        <span>PRACTICE STAKE (USD)</span>
        <input
          type="number"
          min="0.01"
          step="0.01"
          max={balance}
          value={practiceStake}
          disabled={!!practiceRoundId || practiceBusy}
          onChange={e => setPracticeStake(e.target.value)}
        />
      </label>
      <div className="control-summary">
        <span>SELECTIONS</span>
        <strong>1 tile</strong>
      </div>
    </div>

    {!practiceRoundId && !practiceResult && (
      <button
        className="primary-button"
        onClick={startPracticeRound}
        disabled={practiceBusy || practiceBalance <= 0}
      >
        {practiceBusy ? 'Starting...' : 'Start practice round'}
      </button>
    )}

    {practiceRoundId && (
      <p className="notice">Choose exactly one tile to finish your round.</p>
    )}

    {practiceResult && (
      <>
        <div className="notice" role="status">
          {practiceMessage}
          {practiceResult === 'won' && (
            <p>Payout: {money(practicePayout)}</p>
          )}
        </div>
        <button
          className="primary-button"
          onClick={startPracticeRound}
          disabled={practiceBusy}
        >
          {practiceBusy ? 'Please wait...' : 'Play another practice round'}
        </button>
      </>
    )}

   {!practiceResult && !practiceRoundId && (
  <div className="notice" role="status">
    {practiceMessage || 'Practice balance is waiting to load.'}
  </div>
)}
    <div className="notice">
      Practice mode uses virtual credits only. It does not use your real wallet, accept deposits or generate withdrawable winnings.
    </div>

    <div className="auto-bet-panel">
      <div className="panel-heading">
        <div>
          <span className="section-label">PLAY SETTINGS</span>
          <h2>Auto Bet.</h2>
        </div>
        <span className="preview-tag">NOT ACTIVE</span>
      </div>

      <p className="auto-description">
        Set your preferences now. These settings are saved on this device for when the feature is ready.
      </p>

      <div className="auto-settings-grid">
        <label>
          Stake per round (USD)
          <input type="number" min="0.01" step="0.01" value={autoSettings.stake}
            onChange={e => updateAutoSetting('stake', e.target.value)} />
        </label>
        <label>
          Number of rounds
          <input type="number" min="1" max="1000" step="1" value={autoSettings.rounds}
            onChange={e => updateAutoSetting('rounds', e.target.value)} />
        </label>
        <label>
          Stop on profit (USD)
          <input type="number" min="0" step="0.01" value={autoSettings.stopProfit}
            onChange={e => updateAutoSetting('stopProfit', e.target.value)} />
        </label>
        <label>
          Stop on loss (USD)
          <input type="number" min="0" step="0.01" value={autoSettings.stopLoss}
            onChange={e => updateAutoSetting('stopLoss', e.target.value)} />
        </label>
      </div>

      <div className="auto-toggle-list">
        <label className="toggle-row">
          <span><strong>Stop if a round wins</strong><small>Pause after a winning round</small></span>
          <input type="checkbox" checked={autoSettings.stopOnWin}
            onChange={e => updateAutoSetting('stopOnWin', e.target.checked)} />
        </label>
        <label className="toggle-row">
          <span><strong>Stop if a round loses</strong><small>Pause after a losing round</small></span>
          <input type="checkbox" checked={autoSettings.stopOnLoss}
            onChange={e => updateAutoSetting('stopOnLoss', e.target.checked)} />
        </label>
      </div>

      {autoSettingsMessage && <p className="settings-saved">{autoSettingsMessage}</p>}

      <button className="secondary-button" onClick={() => {
        setAutoSettings(defaultAutoSettings)
        setAutoSettingsMessage('Default settings restored.')
      }}>Reset settings</button>

      <button className="primary-button auto-disabled-button" disabled>
        Auto Bet unavailable until launch
      </button>
    </div>
  </section>
)}

{tab === 'wallet' && walletPage === 'main' && (
  <section className="dashboard-panel">
    <span className="section-label">YOUR QUADRA WALLET</span>
    <h2>Wallet.</h2>
    <p>Your USD account balance and financial activity.</p>

    {walletLoading && (
      <div className="notice">Loading wallet...</div>
    )}

    {walletMessage && (
      <div className="notice" role="status">{walletMessage}</div>
    )}

    <div className="control-summary">
      <span>AVAILABLE BALANCE</span>
      <strong>{money(balance)}</strong>
      <small>{currency}</small>
    </div>

    <div className="wallet-main-actions">
      <button
        className="primary-button"
        onClick={() => openWalletPage('deposit')}
      >
        Deposit
      </button>

      <button
        className="secondary-button"
        onClick={() => openWalletPage('withdraw')}
      >
        Withdraw
      </button>
    </div>

    <div className="admin-section">
      <span className="section-label">RECENT TRANSACTIONS</span>
      <h2>Wallet activity.</h2>

      {transactions.length === 0 ? (
        <div className="empty-state">
          <span>—</span>
          <strong>No transactions yet</strong>
          <p>Your wallet transactions will appear here.</p>
        </div>
      ) : (
        transactions.map(transaction => (
          <div className="profile-detail" key={transaction.id}>
            <div>
              <strong>{transaction.type.replace('_', ' ')}</strong>
              <p>{transaction.description || transaction.status}</p>
              <small>
                {new Date(transaction.created_at).toLocaleString()}
              </small>
            </div>
            <strong>{money(transaction.amount)}</strong>
          </div>
        ))
      )}
    </div>

    <button
      className="secondary-button"
      onClick={() => loadAccountData(userId)}
      disabled={walletLoading}
    >
      Refresh wallet
    </button>
  </section>
)}
          {tab === 'wallet' && walletPage === 'deposit' && (
            <section className="dashboard-panel">
              <button className="text-action" onClick={() => openWalletPage('main')}>Back to Wallet</button>
              <span className="section-label">YOUR WALLET</span>
              <h2>Deposit.</h2>
              <p>Send USDT to the QUADRA address below using the selected network. Submit the request only after the transfer is complete.</p>

              {walletMessage && <div className="notice" role="status">{walletMessage}</div>}

              <form onSubmit={submitDeposit}>
                <label htmlFor="deposit-network">Choose deposit network</label>
                <select id="deposit-network" value={depositNetwork} onChange={e => setDepositNetwork(e.target.value)} required>
                  <option value="Ethereum (ERC20)">Ethereum (ERC20)</option>
                  <option value="BNB Smart Chain (BEP20)">BNB Smart Chain (BEP20)</option>
                </select>

                <label>Official QUADRA USDT deposit address</label>
                <div className="address-copy-row">
                  <strong>{QUADRA_DEPOSIT_ADDRESS}</strong>
                  <button type="button" className="secondary-button" onClick={copyDepositAddress}>Copy address</button>
                </div>

                {depositCopyMessage && <p role="status">{depositCopyMessage}</p>}

                <div className="notice">Use only the network selected above. Ethereum ERC20 and BNB Smart Chain BEP20 are different networks. Sending through the wrong network may result in loss of funds.</div>

                <label htmlFor="deposit-amount">Amount in USD</label>
                <input id="deposit-amount" type="number" min="0.01" step="0.01" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} required />

                <label htmlFor="deposit-hash">Transaction hash</label>
                <input id="deposit-hash" value={depositReference} onChange={e => setDepositReference(e.target.value)} placeholder="0x..." required />

                <button className="primary-button" disabled={walletActionLoading}>
                  {walletActionLoading ? 'Submitting...' : 'Submit deposit request'}
                </button>
              </form>
            </section>
          )}

          {tab === 'wallet' && walletPage === 'withdraw' && (
            <section className="dashboard-panel">
              <button className="text-action" onClick={() => openWalletPage('main')}>Back to Wallet</button>
              <span className="section-label">YOUR WALLET</span>
              <h2>Withdraw.</h2>
              <p>Choose your preferred network and enter your receiving wallet address. Your requested amount will be reserved while your request is reviewed.</p>

              {walletMessage && <div className="notice" role="status">{walletMessage}</div>}

              <form onSubmit={submitWithdrawal}>
                <label htmlFor="withdrawal-network">Withdrawal network</label>
                <select id="withdrawal-network" value={withdrawalNetwork} onChange={e => setWithdrawalNetwork(e.target.value)} required>
                  <option value="Ethereum (ERC20)">Ethereum (ERC20)</option>
                  <option value="BNB Smart Chain (BEP20)">BNB Smart Chain (BEP20)</option>
                </select>

                <label htmlFor="withdrawal-amount">Amount in USD</label>
                <input id="withdrawal-amount" type="number" min="0.01" step="0.01" value={withdrawalAmount} onChange={e => setWithdrawalAmount(e.target.value)} required />

                <label htmlFor="withdrawal-address">Your receiving wallet address</label>
                <input id="withdrawal-address" value={withdrawalAddress} onChange={e => setWithdrawalAddress(e.target.value)} placeholder="0x..." required />

                <div className="notice">Ethereum ERC20 and BNB Smart Chain BEP20 are different networks. Make sure your receiving wallet supports the selected network.</div>

                <button className="primary-button" disabled={walletActionLoading}>
                  {walletActionLoading ? 'Submitting...' : 'Submit withdrawal request'}
                </button>
              </form>
            </section>
          )}

          {tab === 'activity' && (
            <section className="dashboard-panel">
              <span className="section-label">ACCOUNT RECORDS</span>
              <h2>Recent activity.</h2>
              {transactions.length === 0 ? (
                <div className="empty-state"><span>—</span><strong>No transactions yet</strong><p>Your financial transaction history will appear here.</p></div>
              ) : transactions.map(transaction => (
                <div className="profile-detail" key={transaction.id}>
                  <div>
                    <strong>{transaction.type.replace('_', ' ')}</strong>
                    <p>{transaction.description || transaction.status}</p>
                    <small>{new Date(transaction.created_at).toLocaleString()}</small>
                  </div>
                  <strong>{money(transaction.amount)}</strong>
                </div>
              ))}
            </section>
          )}

          {tab === 'referrals' && (
            <section className="dashboard-panel">
              <span className="section-label">GROW WITH QUADRA</span>
              <h2>Your referrals.</h2>
              <div className="referral-stat"><strong>0</strong><span>People referred</span></div>
              <p>Your referral link and rewards will appear here when the referral system is connected.</p>
            </section>
          )}

          {tab === 'profile' && (
            <section className="dashboard-panel">
              <span className="section-label">ACCOUNT SETTINGS</span>
              <h2>Your profile.</h2>
              <div className="profile-detail"><span>Email address</span><strong>{userEmail}</strong></div>
              <div className="profile-detail"><span>Account currency</span><strong>{currency}</strong></div>
              <div className="profile-detail"><span>Account type</span><strong>{isAdmin ? 'Administrator' : 'User'}</strong></div>
              <button className="logout-action" onClick={logout}>Log out of QUADRA</button>
            </section>
          )}

          {tab === 'admin' && isAdmin && (
            <section className="dashboard-panel">
              <span className="section-label">QUADRA CONTROL CENTRE</span>
              <h2>Management dashboard.</h2>
              <p>Review requests and manage accounts. Withdrawals are paid manually by you.</p>

              <button className="secondary-button" onClick={loadAdminData} disabled={adminLoading}>
                {adminLoading ? 'Refreshing...' : 'Refresh management data'}
              </button>

              {adminMessage && <div className="notice" role="status">{adminMessage}</div>}

              <div className="dashboard-grid admin-stats">
                <div><span className="section-label">REGISTERED USERS</span><h2>{adminUsers.length}</h2></div>
                <div><span className="section-label">DEPOSIT REQUESTS</span><h2>{deposits.length}</h2></div>
                <div><span className="section-label">WITHDRAWAL REQUESTS</span><h2>{withdrawals.length}</h2></div>
                <div><span className="section-label">PENDING DEPOSITS</span><h2>{deposits.filter(x => x.status === 'pending').length}</h2></div>
              </div>

              <div className="admin-section">
                <span className="section-label">DEPOSIT MANAGEMENT</span>
                <h2>Incoming deposits</h2>
                {deposits.length === 0 ? <p>No deposit requests yet.</p> : deposits.map(item => (
                  <div className="profile-detail admin-record" key={item.id}>
                    <div>
                      <strong>{money(item.amount)} · {item.status.toUpperCase()}</strong>
                      <p>User: {item.user_id}</p>
                      <p>Network: {item.network || 'Not provided'}</p>
                      <p>Transaction hash: {item.payment_reference || 'Not provided'}</p>
                      <small>{new Date(item.created_at).toLocaleString()}</small>
                      {item.admin_note && <p>Admin note: {item.admin_note}</p>}
                    </div>
                    {item.status === 'pending' && (
                      <div className="wallet-actions">
                        <button onClick={() => adminAction('approve_deposit', item.id, adminNote)}>Approve</button>
                        <button onClick={() => adminAction('reject_deposit', item.id, adminNote)}>Reject</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="admin-section">
                <span className="section-label">WITHDRAWAL MANAGEMENT</span>
                <h2>Outgoing requests</h2>
                {withdrawals.length === 0 ? <p>No withdrawal requests yet.</p> : withdrawals.map(item => (
                  <div className="profile-detail admin-record" key={item.id}>
                    <div>
                      <strong>{money(item.amount)} · {item.status.toUpperCase()}</strong>
                      <p>User: {item.user_id}</p>
                      <p>Network: {item.network}</p>
                      <p>Destination: {item.destination_address}</p>
                      <small>{new Date(item.created_at).toLocaleString()}</small>
                      {item.transaction_hash && <p>TX: {item.transaction_hash}</p>}
                      {item.admin_note && <p>Admin note: {item.admin_note}</p>}
                    </div>

                    <div className="admin-record-actions">
                      {item.status === 'pending' && (
                        <>
                          <input placeholder="Optional admin note" value={adminNote} onChange={e => setAdminNote(e.target.value)} />
                          <div className="wallet-actions">
                            <button onClick={() => adminAction('approve_withdrawal', item.id, adminNote)}>Approve request</button>
                            <button onClick={() => adminAction('reject_withdrawal', item.id, adminNote)}>Reject + refund</button>
                          </div>
                        </>
                      )}

                      {item.status === 'approved' && (
                        <>
                          <p>Verify the recipient, token, amount and blockchain transaction before confirming payment.</p>
                          <input placeholder="0x... transaction hash" value={payoutHashes[item.id] || ''}
                            onChange={e => setPayoutHashes(prev => ({ ...prev, [item.id]: e.target.value }))} />
                          <button onClick={() => adminAction('mark_withdrawal_paid', item.id, '', payoutHashes[item.id])}
                            disabled={!/^0x[a-fA-F0-9]{64}$/.test(payoutHashes[item.id]?.trim() || '')}>
                            Confirm sent · Mark paid
                          </button>
                          <button onClick={() => adminAction('reject_withdrawal', item.id, adminNote)}>Reject + refund</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="admin-section">
                <span className="section-label">USER MANAGEMENT</span>
                <h2>Registered accounts</h2>
                {adminUsers.length === 0 ? <p>No user profiles found.</p> : adminUsers.map(item => (
                  <div className="profile-detail" key={item.id}>
                    <div>
                      <strong>{item.email || 'Email unavailable'}</strong>
                      <small>{item.id}</small>
                      <p>Joined: {new Date(item.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <footer className="dashboard-footer">
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
        <a className="brand" href="#" onClick={e => { e.preventDefault(); resetForm('home') }}>QUADRA<span>.</span></a>
        <nav><a href="#experience">Experience</a><a href="#about">About</a></nav>
        <div className="nav-actions">
          <button className="login-button" onClick={() => resetForm('login')}>Log in</button>
          <button className="nav-button" onClick={() => resetForm('signup')}>Create account</button>
        </div>
      </header>

      {isAuth ? (
        <section className="auth-section">
          <div className="auth-card">
            <span className="section-label">WELCOME TO QUADRA</span>
            <h1>{mode === 'login' ? 'Welcome back.' : mode === 'signup' ? 'Create your account.' : 'Reset your password.'}</h1>
            <p className="auth-description">
              {mode === 'login' ? 'Sign in to continue your QUADRA experience.' : mode === 'signup' ? 'A new experience begins with your account.' : 'Enter your email to receive password recovery instructions.'}
            </p>

            <form onSubmit={handleAuth}>
              <label htmlFor="email">Email address</label>
              <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required />

              {mode !== 'forgot' && <>
                <label htmlFor="password">Password</label>
                <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} required />
              </>}

              {mode === 'signup' && <>
                <label htmlFor="confirm-password">Confirm password</label>
                <input id="confirm-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Enter your password again" autoComplete="new-password" minLength={8} required />
              </>}

              {mode === 'login' && <button type="button" className="forgot-link" onClick={() => resetForm('forgot')}>Forgot password?</button>}

              <button className="primary-button auth-submit" disabled={loading}>
                {loading ? 'Please wait...' : mode === 'login' ? 'Log in' : mode === 'signup' ? 'Create account' : 'Send recovery email'}
              </button>

              {message && <p className="auth-message" role="status">{message}</p>}
            </form>

            <div className="auth-switch">
              {mode === 'login' ? <>New to QUADRA? <button onClick={() => resetForm('signup')}>Create an account</button></> : <>Already have an account? <button onClick={() => resetForm('login')}>Log in</button></>}
            </div>

            <button className="back-home" onClick={() => resetForm('home')}>Back to homepage</button>
          </div>
        </section>
      ) : (
        <>
          <section className="hero" id="experience">
            <div className="eyebrow"><span className="status-dot"></span>A NEW KIND OF GAMING EXPERIENCE</div>
            <h1>Less noise.<br /><span>More anticipation.</span></h1>
            <p className="hero-description">A refined Mines experience built around simplicity, anticipation and the art of the unexpected.</p>

            <div className="landing-mines">
              <div className="landing-mines-tile"><span>✦</span></div>
              <div className="landing-mines-tile"></div>
              <div className="landing-mines-tile"></div>
              <div className="landing-mines-tile"></div>
            </div>

            <button className="primary-button" onClick={() => resetForm('signup')}>Get started</button>
            <p className="hero-note">QUADRA MINES · A DISTINCT EXPERIENCE</p>
          </section>

          <section className="about-section" id="about">
            <span className="section-label">THE QUADRA PHILOSOPHY</span>
            <h2>Designed with intention.</h2>
            <p>A focused game interface. A beautifully simple concept. An experience designed with care.</p>
          </section>
        </>
      )}

      <footer className="site-footer">
        <span className="brand">QUADRA<span>.</span></span>
        <span>© 2026 QUADRA</span>
      </footer>
    </main>
  )
}

export default App
