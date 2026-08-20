import React, { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useBranch } from '@/context/BranchContext'
import {
  formatCurrency,
  calculateTax,
  calculateBase,
  calculateCartItem,
  calculateChange,
  formatDateTime
} from '@/utils'
import type { Product, Customer, CashSession, PaymentMethod } from '@/types'
import Modal from '@/components/ui/Modal'
import Invoice from '@/components/pos/Invoice'
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  Barcode,
  DollarSign,
  CreditCard,
  Building2,
  BookOpen,
  CheckCircle2,
  Printer,
  X,
  AlertCircle,
  User,
  RotateCcw,
  Loader2,
  Layers,
  ArrowRight
} from 'lucide-react'
import toast from 'react-hot-toast'

interface POSCartItem {
  product: Product
  quantity: number
  discount: number
}

export default function POSPage() {
  const { profile } = useAuth()
  const { activeBranchId, selectedBranchId, selectedBranch } = useBranch()

  // State
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [activeSession, setActiveSession] = useState<CashSession | null>(null)
  const [loading, setLoading] = useState(true)

  // Cash Session Open Modal
  const [showOpenSessionModal, setShowOpenSessionModal] = useState(false)
  const [initialCashAmount, setInitialCashAmount] = useState('0.00')
  const [openingSession, setOpeningSession] = useState(false)

  // Search & Cart
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [cart, setCart] = useState<POSCartItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Efectivo')
  const [cashReceived, setCashReceived] = useState<string>('')
  const [completing, setCompleting] = useState(false)

  // SAR Config
  const [sarConfig, setSarConfig] = useState<{
    cai?: string
    rango_inicio?: string
    rango_fin?: string
    fecha_limite?: string
    footer_text?: string
  }>({
    cai: '7A2E89-F4D21C-8941AB-DE9C83-20F12E-5C',
    rango_inicio: '000-001-01-00000001',
    rango_fin: '000-001-01-00100000',
    fecha_limite: '2027-12-31',
    footer_text: 'Exija su Factura Fiscal. ¡Gracias por su preferencia!',
  })

  // Success Invoice Modal
  const [successSale, setSuccessSale] = useState<{
    id: string
    invoice_number: string
    created_at: string
    payment_method: string
    cash_received?: number
    change_given?: number
    subtotal: number
    tax_amount: number
    discount_amount: number
    total: number
    customer_name?: string
    customer_rtn?: string
    is_cancelled?: boolean
    items: Array<{
      product_name?: string
      product?: { name: string; code?: string }
      quantity: number
      price: number
      tax_rate: number
      subtotal: number
      discount?: number
    }>
  } | null>(null)

  // Mobile Active Tab: 'products' | 'cart'
  const [mobileTab, setMobileTab] = useState<'products' | 'cart'>('products')

  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadPOSData()
  }, [])

  const loadPOSData = async () => {
    setLoading(true)
    try {
      // 1. Check open cash session for current user
      if (profile?.id) {
        const { data: sessionData } = await supabase
          .from('cash_sessions')
          .select('*')
          .eq('user_id', profile.id)
          .eq('status', 'open')
          .maybeSingle()

        if (!sessionData) {
          setShowOpenSessionModal(true)
        } else {
          setActiveSession(sessionData as CashSession)
        }
      }

      // 2. Load Products, Categories, Customers, and SAR Configuration
      let prodQuery = supabase
        .from('products')
        .select('*, category:categories(name)')
        .eq('is_active', true)
        .order('name')

      if (activeBranchId) {
        prodQuery = prodQuery.eq('branch_id', activeBranchId)
      }

      const [pRes, cRes, custRes, configRes] = await Promise.all([
        prodQuery,
        supabase.from('categories').select('id, name').eq('is_active', true).order('name'),
        supabase.from('customers').select('*').eq('is_active', true).order('id'),
        supabase.from('configuration').select('key, value').or(`branch_id.eq.${activeBranchId},branch_id.is.null`),
      ])

      if (pRes.data) setProducts(pRes.data as Product[])
      if (cRes.data) setCategories(cRes.data)
      if (custRes.data) {
        setCustomers(custRes.data as Customer[])
        // Default customer: Consumidor Final (id=1 or first)
        const defaultCust = custRes.data.find((c) => c.id === 1) || custRes.data[0]
        setSelectedCustomer(defaultCust || null)
      }

      if (configRes.data && configRes.data.length > 0) {
        const configMap: Record<string, string> = {}
        configRes.data.forEach((r: { key: string; value: string }) => {
          configMap[r.key] = r.value
        })
        setSarConfig({
          cai: configMap['SAR_CAI'] || '7A2E89-F4D21C-8941AB-DE9C83-20F12E-5C',
          rango_inicio: configMap['SAR_RangeMin'] || '000-001-01-00000001',
          rango_fin: configMap['SAR_RangeMax'] || '000-001-01-00100000',
          fecha_limite: configMap['SAR_DeadlineDate'] || '2027-12-31',
          footer_text: configMap['TicketFooter'] || 'Exija su Factura Fiscal. ¡Gracias por su preferencia!',
        })
      }
    } catch (err) {
      toast.error('Error al inicializar Punto de Venta')
    } finally {
      setLoading(false)
    }
  }

  // Handle Opening Cash Session
  const handleOpenCashSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.id) return
    const amount = parseFloat(initialCashAmount) || 0

    setOpeningSession(true)
    try {
      const { data, error } = await supabase
        .from('cash_sessions')
        .insert({
          user_id: profile.id,
          branch_id: activeBranchId,
          initial_amount: amount,
          status: 'open',
        })
        .select()
        .single()

      if (error) throw error
      setActiveSession(data as CashSession)
      setShowOpenSessionModal(false)
      toast.success('Caja abierta exitosamente. ¡Buenas ventas!')
    } catch (err: any) {
      toast.error(err.message || 'Error al abrir caja')
    } finally {
      setOpeningSession(false)
    }
  }

  // Cart Operations
  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      toast.error(`"${product.name}" está agotado`)
      return
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id)
      if (existing) {
        if (existing.quantity + 1 > product.stock) {
          toast.error(`Stock máximo disponible: ${product.stock}`)
          return prev
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { product, quantity: 1, discount: 0 }]
    })
  }

  const updateQuantity = (productId: number, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId)
      return
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          if (qty > item.product.stock) {
            toast.error(`Stock máximo disponible: ${item.product.stock}`)
            return { ...item, quantity: item.product.stock }
          }
          return { ...item, quantity: qty }
        }
        return item
      })
    )
  }

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId))
  }

  const clearCart = () => {
    setCart([])
    setCashReceived('')
  }

  // Totals calculations based on Honduran ISV inclusive pricing
  const totals = useMemo(() => {
    let subtotal = 0
    let totalTax15 = 0
    let totalTax18 = 0
    let totalDiscount = 0

    for (const item of cart) {
      const gross = item.product.sale_price * item.quantity
      const disc = item.discount || 0
      const lineSub = Math.max(0, gross - disc)
      const rate = item.product.tax_rate

      const tax = calculateTax(lineSub, rate)
      if (rate === 15) totalTax15 += tax
      if (rate === 18) totalTax18 += tax

      subtotal += lineSub
      totalDiscount += disc
    }

    const total = subtotal // Since prices are already tax-inclusive in Honduras
    const baseExenta = cart
      .filter((i) => i.product.tax_rate === 0)
      .reduce((s, i) => s + (i.product.sale_price * i.quantity - (i.discount || 0)), 0)

    const baseGravada15 = cart
      .filter((i) => i.product.tax_rate === 15)
      .reduce((s, i) => s + calculateBase(i.product.sale_price * i.quantity - (i.discount || 0), 15), 0)

    const baseGravada18 = cart
      .filter((i) => i.product.tax_rate === 18)
      .reduce((s, i) => s + calculateBase(i.product.sale_price * i.quantity - (i.discount || 0), 18), 0)

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      totalTax15: Math.round(totalTax15 * 100) / 100,
      totalTax18: Math.round(totalTax18 * 100) / 100,
      totalTax: Math.round((totalTax15 + totalTax18) * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      baseExenta: Math.round(baseExenta * 100) / 100,
      baseGravada15: Math.round(baseGravada15 * 100) / 100,
      baseGravada18: Math.round(baseGravada18 * 100) / 100,
      total: Math.round(total * 100) / 100,
    }
  }, [cart])

  const cashRec = parseFloat(cashReceived) || 0
  const changeGiven = paymentMethod === 'Efectivo' ? calculateChange(cashRec, totals.total) : 0

  // Complete Sale (Atomic execution)
  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      toast.error('El carrito está vacío')
      return
    }
    if (!activeSession) {
      setShowOpenSessionModal(true)
      return
    }
    if (paymentMethod === 'Efectivo' && cashRec < totals.total) {
      toast.error('El efectivo recibido es menor al total a cobrar')
      return
    }
    if (!profile?.id) return

    setCompleting(true)
    try {
      // 1. Get guaranteed unique invoice number
      let invoiceNumber = ''
      try {
        const { data: latestSales } = await supabase
          .from('sales')
          .select('id, invoice_number')
          .order('id', { ascending: false })
          .limit(20)

        let maxSeq = 0
        if (latestSales && latestSales.length > 0) {
          for (const s of latestSales) {
            if (s.invoice_number) {
              const match = s.invoice_number.match(/(\d+)$/)
              if (match) {
                const parsed = parseInt(match[1], 10)
                if (!isNaN(parsed) && parsed > maxSeq) {
                  maxSeq = parsed
                }
              }
            }
          }
        }

        const { count } = await supabase
          .from('sales')
          .select('*', { count: 'exact', head: true })

        const nextSeq = Math.max(maxSeq + 1, (count || 0) + 1)
        const prefix = sarConfig?.rango_inicio
          ? sarConfig.rango_inicio.slice(0, 11)
          : '000-001-01-'

        invoiceNumber = `${prefix}${String(nextSeq).padStart(8, '0')}`
      } catch {
        invoiceNumber = `000-001-01-${String(Date.now()).slice(-8)}`
      }

      // 2. Prepare items payload for RPC
      const itemsPayload = cart.map((i) => ({
        product_id: i.product.id,
        quantity: i.quantity,
        price: i.product.sale_price,
        tax_rate: i.product.tax_rate,
        subtotal: Math.round((i.product.sale_price * i.quantity - (i.discount || 0)) * 100) / 100,
        discount: i.discount || 0,
      }))

      // 3. Execute atomic transaction in Supabase
      const { data: saleResult, error: rpcError } = await supabase.rpc('complete_sale', {
        p_invoice_number: invoiceNumber,
        p_user_id: profile.id,
        p_customer_id: selectedCustomer?.id || 1,
        p_cash_session_id: activeSession.id,
        p_branch_id: activeBranchId,
        p_subtotal: totals.subtotal,
        p_tax_amount: totals.totalTax,
        p_discount_amount: totals.totalDiscount,
        p_total: totals.total,
        p_payment_method: paymentMethod,
        p_cash_received: paymentMethod === 'Efectivo' ? cashRec : totals.total,
        p_change_given: changeGiven,
        p_customer_name: selectedCustomer?.name || 'Consumidor Final',
        p_customer_rtn: selectedCustomer?.rtn || '',
        p_items: itemsPayload,
      })

      if (rpcError) throw rpcError

      // Set Fiscal Invoice Success Modal
      setSuccessSale({
        id: invoiceNumber,
        invoice_number: invoiceNumber,
        created_at: new Date().toISOString(),
        payment_method: paymentMethod,
        cash_received: paymentMethod === 'Efectivo' ? cashRec : totals.total,
        change_given: changeGiven,
        subtotal: totals.subtotal,
        tax_amount: totals.totalTax,
        discount_amount: totals.totalDiscount,
        total: totals.total,
        customer_name: selectedCustomer?.name || 'Consumidor Final',
        customer_rtn: selectedCustomer?.rtn || 'CF',
        items: cart.map((i) => ({
          product_name: i.product.name,
          product: { name: i.product.name, code: i.product.code },
          quantity: i.quantity,
          price: i.product.sale_price,
          tax_rate: i.product.tax_rate,
          subtotal: i.product.sale_price * i.quantity,
          discount: i.discount,
        })),
      })

      clearCart()
      toast.success('¡Venta realizada con éxito!')
      loadPOSData() // Refresh stock
    } catch (err: any) {
      toast.error(err.message || 'Error al procesar la venta')
    } finally {
      setCompleting(false)
    }
  }

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const q = search.toLowerCase()
    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.includes(q))

    const matchesCat =
      selectedCategory === 'all' || String(p.category_id) === selectedCategory

    return matchesSearch && matchesCat
  })

  // Handle direct barcode scanner enter key
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filteredProducts.length === 1) {
      addToCart(filteredProducts[0])
      setSearch('')
    }
  }

  return (
    <div className="space-y-4">
      {/* Top Banner: Cash Status */}
      <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            Caja Turno #{activeSession?.id || '---'}
          </span>
          <span className="text-slate-400 hidden sm:inline">
            · Cajero: {profile?.full_name}
          </span>
        </div>

        {/* Mobile Tab Switcher */}
        <div className="flex md:hidden items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setMobileTab('products')}
            className={`px-3 py-1 rounded-lg font-bold text-xs ${
              mobileTab === 'products'
                ? 'bg-white dark:bg-slate-700 text-sky-500 shadow-sm'
                : 'text-slate-500'
            }`}
          >
            Productos ({filteredProducts.length})
          </button>
          <button
            onClick={() => setMobileTab('cart')}
            className={`px-3 py-1 rounded-lg font-bold text-xs flex items-center gap-1 ${
              mobileTab === 'cart'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-slate-500'
            }`}
          >
            <ShoppingCart className="w-3 h-3" />
            <span>Carrito ({cart.length})</span>
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT COLUMN: Products & Search */}
        <div
          className={`lg:col-span-7 space-y-3 ${
            mobileTab === 'cart' ? 'hidden lg:block' : 'block'
          }`}
        >
          {/* Search bar */}
          <div className="card p-3 space-y-2">
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Escanear código de barra o buscar producto..."
                className="input-base pl-11 py-2.5 text-base font-medium"
                autoFocus
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Categories chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                Todos
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(String(c.id))}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    selectedCategory === String(c.id)
                      ? 'bg-sky-500 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {filteredProducts.map((p) => {
              const isOut = p.stock <= 0
              const isLow = p.stock <= p.min_stock && !isOut
              return (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  disabled={isOut}
                  className={`card p-3 text-left flex flex-col justify-between transition-all duration-150 relative group ${
                    isOut
                      ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800/40'
                      : 'hover:border-sky-400 hover:shadow-md active:scale-95'
                  }`}
                >
                  <div>
                    <span className="font-mono text-[10px] font-bold text-slate-400 block truncate">
                      {p.code}
                    </span>
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs line-clamp-2 mt-0.5">
                      {p.name}
                    </h4>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {formatCurrency(p.sale_price)}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                        isOut
                          ? 'bg-rose-100 text-rose-600'
                          : isLow
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {isOut ? '0' : p.stock}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Cart & Checkout */}
        <div
          className={`lg:col-span-5 space-y-3 ${
            mobileTab === 'products' ? 'hidden lg:block' : 'block'
          }`}
        >
          <div className="card p-4 flex flex-col h-[calc(100vh-210px)] justify-between shadow-lg">
            {/* Customer selector & Cart Header */}
            <div className="space-y-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-emerald-500" />
                  Orden Actual
                </h3>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-xs text-rose-500 hover:underline font-semibold flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Vaciar
                  </button>
                )}
              </div>

              {/* Customer Select */}
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <select
                  value={selectedCustomer?.id || 1}
                  onChange={(e) => {
                    const cust = customers.find((c) => c.id === parseInt(e.target.value, 10))
                    setSelectedCustomer(cust || null)
                  }}
                  className="input-base text-xs py-1.5"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.rtn ? `(RTN: ${c.rtn})` : ''} {c.debt > 0 ? `· Deuda: L ${c.debt}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto py-2 space-y-2.5 pr-1 scrollbar-thin">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-6">
                  <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                    <ShoppingCart className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">El carrito está vacío</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                    Selecciona o busca productos para agregarlos a la orden
                  </p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="p-3 rounded-2xl bg-slate-50/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-xs space-y-2 hover:border-sky-300 dark:hover:border-sky-700/60 transition-all"
                  >
                    {/* Row 1: Name, unit price & remove button */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-snug break-words">
                          {item.product.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                            {formatCurrency(item.product.sale_price)} c/u
                          </span>
                          <span
                            className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
                              item.product.tax_rate > 0
                                ? 'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                            }`}
                          >
                            ISV {item.product.tax_rate}%
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors flex-shrink-0"
                        title="Quitar producto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Row 2: Quantity stepper and total price */}
                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 dark:border-slate-700/50">
                      <div className="flex items-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-0.5 shadow-2xs">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Disminuir"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={item.product.stock}
                          value={item.quantity}
                          onChange={(e) =>
                            updateQuantity(item.product.id, parseFloat(e.target.value) || 1)
                          }
                          className="w-9 text-center font-black text-xs bg-transparent border-0 focus:outline-none text-slate-900 dark:text-white"
                        />
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Aumentar"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block -mb-0.5 font-medium">
                          Total
                        </span>
                        <p className="font-black text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                          {formatCurrency(item.product.sale_price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bottom Checkout Section */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-3 bg-white dark:bg-slate-900">
              {/* ISV Honduras Breakdown */}
              <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>Subtotal Gravado (15%):</span>
                  <span>{formatCurrency(totals.baseGravada15)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Impuesto ISV 15%:</span>
                  <span>{formatCurrency(totals.totalTax15)}</span>
                </div>
                {totals.totalTax18 > 0 && (
                  <div className="flex justify-between">
                    <span>Impuesto ISV 18%:</span>
                    <span>{formatCurrency(totals.totalTax18)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800 font-black text-base text-slate-900 dark:text-white">
                  <span>TOTAL A PAGAR:</span>
                  <span className="text-emerald-500 text-xl font-extrabold">
                    {formatCurrency(totals.total)}
                  </span>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="grid grid-cols-4 gap-1.5">
                {(['Efectivo', 'Tarjeta', 'Transferencia', 'Crédito'] as PaymentMethod[]).map(
                  (pm) => (
                    <button
                      key={pm}
                      type="button"
                      onClick={() => setPaymentMethod(pm)}
                      className={`py-1.5 px-1 rounded-xl text-[11px] font-bold transition-all ${
                        paymentMethod === pm
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {pm}
                    </button>
                  )
                )}
              </div>

              {/* Cash Received Input */}
              {paymentMethod === 'Efectivo' && (
                <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                      Efectivo Recibido
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      placeholder={totals.total.toFixed(2)}
                      className="input-base py-1 px-2 font-mono font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                      Cambio a Devolver
                    </label>
                    <div className="h-8 flex items-center px-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-black text-sm">
                      {formatCurrency(changeGiven)}
                    </div>
                  </div>
                </div>
              )}

              {/* Checkout Button */}
              <button
                onClick={handleCompleteSale}
                disabled={cart.length === 0 || completing}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-[0.99] text-white font-extrabold text-base shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {completing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Facturando SAR...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Cobrar {formatCurrency(totals.total)}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Open Session Mandatory Modal */}
      <Modal
        isOpen={showOpenSessionModal}
        onClose={() => {}}
        title="Apertura de Turno de Caja"
        size="sm"
      >
        <form onSubmit={handleOpenCashSession} className="space-y-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-2">
            <DollarSign className="w-8 h-8" />
          </div>
          <h4 className="font-bold text-slate-900 dark:text-white">
            Ingresa tu monto inicial de caja
          </h4>
          <p className="text-xs text-slate-500">
            Debes registrar el efectivo base con el que inicias para calcular el arqueo al cierre.
          </p>

          <div>
            <input
              type="number"
              step="0.01"
              required
              min="0"
              value={initialCashAmount}
              onChange={(e) => setInitialCashAmount(e.target.value)}
              placeholder="0.00"
              className="input-base text-center font-mono font-black text-2xl py-3 text-emerald-500"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={openingSession}
            className="btn-primary w-full justify-center text-sm py-3"
          >
            {openingSession ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>Abrir Caja y Comenzar Turno</span>
          </button>
        </form>
      </Modal>

      {/* Professional Fiscal Invoice Modal */}
      {successSale && (
        <Invoice
          sale={successSale}
          items={successSale.items}
          branch={selectedBranch}
          sarConfig={sarConfig}
          onClose={() => setSuccessSale(null)}
        />
      )}
    </div>
  )
}
