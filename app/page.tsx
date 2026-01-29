"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { Calendar, Home, Plus, ChevronLeft, ChevronRight } from "lucide-react"

type DrinkEntry = {
  id: number
  emoji: string
  type: string
  time: string
  amount: string
}

type PeeEntry = {
  id: number
  emoji: string
  time: string
  size: 1 | 2 | 3
}

type DayData = {
  drinks: DrinkEntry[]
  pees: PeeEntry[]
}

type AllData = Record<string, DayData>

const drinkEmojis = ["💧", "🥛", "☕", "🍸", "🥃", "🧃", "🍺", "🍵"]
const peeEmojis = ["🚽", "💦", "🌊", "🐥", "🐤", "🦆", "😊", "🤖", "🧻"]

const STORAGE_KEY = "pee-app-data"

const defaultData: AllData = {}

function getTodayKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")}`
}

function getTimeSlot(time: string): number {
  const hour = parseInt(time.split(":")[0])
  return Math.floor(hour / 3)
}

function getCurrentTime(): string {
  const now = new Date()
  return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`
}

function sortByTime<T extends { time: string }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => a.time.localeCompare(b.time))
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

function SizeIndicator({ size }: { size: 1 | 2 | 3 }) {
  return (
    <div className="flex flex-col gap-0.5 items-end">
      {[...Array(size)].map((_, i) => (
        <div key={i} className="h-0.5 w-4 bg-amber-600 rounded-full" />
      ))}
    </div>
  )
}

function DeleteConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
  onClose,
}: {
  open: boolean
  title?: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onClose: () => void
}) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 backdrop-blur-md bg-white/30 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 p-4">
        <h3 className="text-base font-bold text-slate-800">{title || "Delete entry?"}</h3>
        {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function DrinkCard({
  entry,
  enableSwipeActions = false,
  onRequestDelete,
  onRequestEdit,
}: {
  entry: DrinkEntry
  enableSwipeActions?: boolean
  onRequestDelete?: (id: number) => void
  onRequestEdit?: (entry: DrinkEntry) => void
}) {
  const [translate, setTranslate] = useState(0)
  const [isSliding, setIsSliding] = useState(false)
  const draggingRef = useRef(false)
  const startXRef = useRef(0)

  const THRESHOLD = 80

  const reset = () => {
    setTranslate(0)
    setIsSliding(false)
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!enableSwipeActions) return
    draggingRef.current = true
    startXRef.current = e.clientX
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!enableSwipeActions) return
    if (!draggingRef.current) return
    const delta = e.clientX - startXRef.current
    // Keep it from going too far
    const clamped = Math.max(-140, Math.min(140, delta))
    setTranslate(clamped)
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!enableSwipeActions) return
    draggingRef.current = false
    try {
      ;(e.currentTarget as Element).releasePointerCapture(e.pointerId)
    } catch {}

    if (translate > THRESHOLD) {
      // swipe right => edit
      setIsSliding(true)
      setTranslate(110)
      setTimeout(() => {
        reset()
        onRequestEdit?.(entry)
      }, 180)
      return
    }

    if (translate < -THRESHOLD) {
      // swipe left => delete (confirm)
      setIsSliding(true)
      setTranslate(-110)
      setTimeout(() => {
        reset()
        onRequestDelete?.(entry.id)
      }, 180)
      return
    }

    reset()
  }

  return (
    <div className="relative">
      {enableSwipeActions && (
        <div className="absolute inset-0 flex items-center justify-between px-4">
          <div className="text-xs font-bold text-slate-600">Edit</div>
          <div className="text-xs font-bold text-red-600">Delete</div>
        </div>
      )}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="bg-gradient-to-br from-sky-100 to-sky-200 rounded-2xl p-3 shadow-md hover:shadow-lg transition-all hover:scale-[1.02] border border-sky-200 h-16 flex items-center"
        style={{
          transform: enableSwipeActions ? `translateX(${translate}px)` : undefined,
          transition: isSliding ? "transform 180ms ease" : undefined,
          touchAction: enableSwipeActions ? "pan-y" : undefined,
        }}
      >
        <div className="flex items-center gap-2 w-full">
          {entry.emoji && <span className="text-2xl shrink-0">{entry.emoji}</span>}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sky-900 text-sm truncate">{entry.type}</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-sky-600">{entry.time}</span>
              {entry.amount && <span className="text-xs font-bold text-sky-700">{entry.amount}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PeeCard({
  entry,
  enableSwipeActions = false,
  onRequestDelete,
  onRequestEdit,
}: {
  entry: PeeEntry
  enableSwipeActions?: boolean
  onRequestDelete?: (id: number) => void
  onRequestEdit?: (entry: PeeEntry) => void
}) {
  const [translate, setTranslate] = useState(0)
  const [isSliding, setIsSliding] = useState(false)
  const draggingRef = useRef(false)
  const startXRef = useRef(0)

  const THRESHOLD = 80

  const reset = () => {
    setTranslate(0)
    setIsSliding(false)
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!enableSwipeActions) return
    draggingRef.current = true
    startXRef.current = e.clientX
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!enableSwipeActions) return
    if (!draggingRef.current) return
    const delta = e.clientX - startXRef.current
    const clamped = Math.max(-140, Math.min(140, delta))
    setTranslate(clamped)
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!enableSwipeActions) return
    draggingRef.current = false
    try {
      ;(e.currentTarget as Element).releasePointerCapture(e.pointerId)
    } catch {}

    if (translate > THRESHOLD) {
      setIsSliding(true)
      setTranslate(110)
      setTimeout(() => {
        reset()
        onRequestEdit?.(entry)
      }, 180)
      return
    }

    if (translate < -THRESHOLD) {
      setIsSliding(true)
      setTranslate(-110)
      setTimeout(() => {
        reset()
        onRequestDelete?.(entry.id)
      }, 180)
      return
    }

    reset()
  }

  return (
    <div className="relative">
      {enableSwipeActions && (
        <div className="absolute inset-0 flex items-center justify-between px-4">
          <div className="text-xs font-bold text-slate-600">Edit</div>
          <div className="text-xs font-bold text-red-600">Delete</div>
        </div>
      )}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="bg-gradient-to-br from-amber-50 to-yellow-100 rounded-2xl p-3 shadow-md hover:shadow-lg transition-all hover:scale-[1.02] border border-yellow-200 h-16 flex items-center"
        style={{
          transform: enableSwipeActions ? `translateX(${translate}px)` : undefined,
          transition: isSliding ? "transform 180ms ease" : undefined,
          touchAction: enableSwipeActions ? "pan-y" : undefined,
        }}
      >
        <div className="flex items-center gap-2 w-full">
          {entry.emoji && <span className="text-2xl">{entry.emoji}</span>}
          <span className="font-bold text-amber-800 text-sm">{entry.time}</span>
          <div className="ml-auto">
            <SizeIndicator size={entry.size} />
          </div>
        </div>
      </div>
    </div>
  )
}

function AddCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      type="button"
      className="w-full bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl p-3 shadow-md hover:shadow-lg transition-all hover:scale-[1.02] border-2 border-dashed border-slate-300 flex items-center justify-center gap-2 text-slate-500 hover:text-slate-700 hover:border-slate-400 h-16"
    >
      <Plus size={18} />
      <span className="font-semibold text-sm">Add</span>
    </button>
  )
}

function Header() {
  return (
    <header className="bg-gradient-to-r from-sky-400 via-sky-500 to-cyan-500 text-white py-4 px-6 shadow-lg">
      <div className="max-w-md mx-auto flex items-center justify-center gap-2">
        <span className="text-3xl drop-shadow-md">💧</span>
        <h1 className="text-2xl font-black tracking-tight drop-shadow-md">PEE-APP</h1>
      </div>
    </header>
  )
}

function BarChart({ data }: { data: DayData }) {
  const timeSlots = ["0-3", "3-6", "6-9", "9-12", "12-15", "15-18", "18-21", "21-24"]
  
  const chartData = useMemo(() => {
    const slots = Array(8).fill(null).map(() => ({ drinks: 0, pees: 0 }))
    
    data.drinks.forEach(drink => {
      const slot = getTimeSlot(drink.time)
      slots[slot].drinks++
    })
    
    data.pees.forEach(pee => {
      const slot = getTimeSlot(pee.time)
      slots[slot].pees++
    })
    
    return slots
  }, [data])

  const maxValue = Math.max(
    ...chartData.map(d => Math.max(d.drinks, d.pees)),
    1
  )

  return (
    <div className="bg-white rounded-2xl p-4 shadow-md border border-slate-200 mb-4">
      <h3 className="text-sm font-bold text-slate-600 mb-4 text-center">Activity by Time</h3>
      <div className="flex items-end justify-between gap-1 h-32">
        {chartData.map((slot, i) => (
          <div key={i} className="flex-1 flex flex-col items-center">
            <div className="flex items-end gap-0.5 h-24 w-full justify-center">
              <div
                className="bg-gradient-to-t from-sky-400 to-sky-300 rounded-t-sm w-3 transition-all"
                style={{ height: `${(slot.drinks / maxValue) * 100}%`, minHeight: slot.drinks > 0 ? '4px' : '0' }}
              />
              <div
                className="bg-gradient-to-t from-amber-400 to-yellow-300 rounded-t-sm w-3 transition-all"
                style={{ height: `${(slot.pees / maxValue) * 100}%`, minHeight: slot.pees > 0 ? '4px' : '0' }}
              />
            </div>
            <span className="text-[9px] text-slate-400 mt-1 font-medium">{timeSlots[i]}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-4 mt-3">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gradient-to-t from-sky-400 to-sky-300 rounded-sm" />
          <span className="text-xs text-slate-500">Drinks</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gradient-to-t from-amber-400 to-yellow-300 rounded-sm" />
          <span className="text-xs text-slate-500">Pees</span>
        </div>
      </div>
    </div>
  )
}

function AddDrinkScreen({
  onBack,
  onSave,
  initial,
  isEditing = false,
}: {
  onBack: () => void
  onSave: (entry: Omit<DrinkEntry, "id">) => void
  initial?: Partial<Omit<DrinkEntry, "id">>
  isEditing?: boolean
}) {
  const [selectedEmoji, setSelectedEmoji] = useState<string>(initial?.emoji ?? "")
  const [selectedType, setSelectedType] = useState<string>(initial?.type ?? "")
  const [time, setTime] = useState<string>(initial?.time ?? getCurrentTime())
  const [amount, setAmount] = useState<string>(() => {
    const raw = initial?.amount ?? ""
    return raw.replace(/\s*ml\s*$/i, "")
  })

  const handleSave = () => {
    onSave({
      emoji: selectedEmoji,
      type: selectedType || "Drink",
      time,
      amount: amount ? `${amount} ml` : "",
    })
    onBack()
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <header className="bg-gradient-to-r from-sky-400 via-sky-500 to-cyan-500 text-white py-4 px-4 shadow-lg">
        <div className="max-w-md mx-auto flex items-center">
          <button onClick={onBack} type="button" className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <ChevronLeft size={24} />
          </button>
          <h1 className="flex-1 text-center text-xl font-bold pr-10">Add Drink</h1>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-md p-4 mb-4 border border-slate-200">
            <label className="block text-sm font-bold text-slate-600 mb-2">Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl text-lg font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          <div className="bg-white rounded-2xl shadow-md p-4 mb-4 border border-slate-200">
            <label className="block text-sm font-bold text-slate-600 mb-2">Drink Type</label>
            <input
              type="text"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              placeholder="e.g. Water, Coffee, Tea..."
              className="w-full p-3 border border-slate-200 rounded-xl text-lg font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          <div className="bg-white rounded-2xl shadow-md p-4 mb-4 border border-slate-200">
            <label className="block text-sm font-bold text-slate-600 mb-2">Emoji (optional)</label>
            <div className="grid grid-cols-4 gap-3">
              {drinkEmojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedEmoji(selectedEmoji === emoji ? "" : emoji)}
                  className={`p-3 text-2xl rounded-xl transition-all ${
                    selectedEmoji === emoji
                      ? "bg-sky-100 ring-2 ring-sky-400 scale-110"
                      : "hover:bg-slate-100"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-4 mb-4 border border-slate-200">
            <label className="block text-sm font-bold text-slate-600 mb-2">Amount in ml (optional)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 250"
              className="w-full p-3 border border-slate-200 rounded-xl text-lg font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="w-full bg-gradient-to-r from-sky-400 via-sky-500 to-cyan-500 text-white py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-95"
          >
            {isEditing ? "Update Drink" : "Save Drink"}
          </button>
        </div>
      </main>
    </div>
  )
}

function AddPeeScreen({
  onBack,
  onSave,
  initial,
  isEditing = false,
}: {
  onBack: () => void
  onSave: (entry: Omit<PeeEntry, "id">) => void
  initial?: Partial<Omit<PeeEntry, "id">>
  isEditing?: boolean
}) {
  const [selectedEmoji, setSelectedEmoji] = useState<string>(initial?.emoji ?? "")
  const [time, setTime] = useState<string>(initial?.time ?? getCurrentTime())
  const [size, setSize] = useState<1 | 2 | 3>(initial?.size ?? 2)

  const handleSave = () => {
    onSave({
      emoji: selectedEmoji,
      time,
      size,
    })
    onBack()
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <header className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-white py-4 px-4 shadow-lg">
        <div className="max-w-md mx-auto flex items-center">
          <button onClick={onBack} type="button" className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <ChevronLeft size={24} />
          </button>
          <h1 className="flex-1 text-center text-xl font-bold pr-10">Add Pee</h1>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-md p-4 mb-4 border border-slate-200">
            <label className="block text-sm font-bold text-slate-600 mb-2">Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl text-lg font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="bg-white rounded-2xl shadow-md p-4 mb-4 border border-slate-200">
            <label className="block text-sm font-bold text-slate-600 mb-2">Amount</label>
            <div className="grid grid-cols-3 gap-3">
              {([1, 2, 3] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className={`p-4 rounded-2xl flex flex-col items-center gap-2 transition-all ${
                    size === s
                      ? "bg-gradient-to-br from-amber-400 to-yellow-400 text-white shadow-md scale-105"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <div className="flex flex-col gap-1 items-center">
                    {[...Array(s)].map((_, i) => (
                      <div key={i} className={`h-1 w-6 rounded-full ${size === s ? "bg-white" : "bg-amber-400"}`} />
                    ))}
                  </div>
                  <span className="text-xs font-bold">{s === 1 ? "Small" : s === 2 ? "Medium" : "Large"}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-4 mb-4 border border-slate-200">
            <label className="block text-sm font-bold text-slate-600 mb-2">Emoji (optional)</label>
            <div className="grid grid-cols-5 gap-2">
              {peeEmojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedEmoji(selectedEmoji === emoji ? "" : emoji)}
                  className={`p-2 text-2xl rounded-xl transition-all ${
                    selectedEmoji === emoji
                      ? "bg-amber-100 ring-2 ring-amber-400 scale-110"
                      : "hover:bg-slate-100"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="w-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-white py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-95"
          >
            {isEditing ? "Update Pee" : "Save Pee"}
          </button>
        </div>
      </main>
    </div>
  )
}

function MainScreen({
  data,
  onCalendarClick,
  onAddDrink,
  onAddPee,
  onRequestDeleteDrink,
  onRequestEditDrink,
  onRequestDeletePee,
  onRequestEditPee,
  title,
  onBack,
  showStats = false,
  showAddButtons = true,
}: {
  data: DayData
  onCalendarClick?: () => void
  onAddDrink?: () => void
  onAddPee?: () => void
  onRequestDeleteDrink?: (id: number) => void
  onRequestEditDrink?: (entry: DrinkEntry) => void
  onRequestDeletePee?: (id: number) => void
  onRequestEditPee?: (entry: PeeEntry) => void
  title?: string
  onBack?: () => void
  showStats?: boolean
  showAddButtons?: boolean
}) {
  const sortedDrinks = useMemo(() => sortByTime(data.drinks), [data.drinks])
  const sortedPees = useMemo(() => sortByTime(data.pees), [data.pees])

  const enableSwipeActions = showAddButtons && !title

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {title ? (
        <header className="bg-gradient-to-r from-sky-400 via-sky-500 to-cyan-500 text-white py-4 px-4 shadow-lg">
          <div className="max-w-md mx-auto flex items-center">
            <button onClick={onBack} type="button" className="p-2 hover:bg-white/20 rounded-full transition-colors">
              <ChevronLeft size={24} />
            </button>
            <h1 className="flex-1 text-center text-xl font-bold pr-10">{title}</h1>
          </div>
        </header>
      ) : (
        <Header />
      )}

      <main className="flex-1 overflow-auto p-4 pb-24">
        <div className="max-w-md mx-auto">
          {showStats && <BarChart data={data} />}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-600 mb-3">What did you drink?</h2>
              <div className="flex flex-col gap-2">
                {sortedDrinks.map((entry) => (
                  <DrinkCard
                    key={entry.id}
                    entry={entry}
                    enableSwipeActions={enableSwipeActions}
                    onRequestDelete={onRequestDeleteDrink}
                    onRequestEdit={onRequestEditDrink}
                  />
                ))}
                {showAddButtons && onAddDrink && <AddCard onClick={onAddDrink} />}
              </div>
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-600 mb-3">How many times?</h2>
              <div className="flex flex-col gap-2">
                {sortedPees.map((entry) => (
                  <PeeCard
                    key={entry.id}
                    entry={entry}
                    enableSwipeActions={enableSwipeActions}
                    onRequestDelete={onRequestDeletePee}
                    onRequestEdit={onRequestEditPee}
                  />
                ))}
                {showAddButtons && onAddPee && <AddCard onClick={onAddPee} />}
              </div>
            </div>
          </div>
        </div>
      </main>

      {onCalendarClick && (
        <>
          {enableSwipeActions && (
            <div className="fixed bottom-[92px] left-0 right-0 z-40 pointer-events-none">
              <div className="max-w-md mx-auto px-4">
                <div className="text-center text-xs font-semibold text-slate-500">
                  Swipe blocks left/right to delete/edit
                </div>
              </div>
            </div>
          )}
        <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-200 py-4 shadow-2xl">
          <div className="flex justify-center">
            <button
              onClick={onCalendarClick}
              type="button"
              className="bg-gradient-to-br from-sky-400 to-cyan-500 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 active:scale-95"
            >
              <Calendar size={28} />
            </button>
          </div>
        </nav>
        </>
      )}
    </div>
  )
}

function CalendarScreen({
  onHomeClick,
  onDayClick,
  allData,
}: {
  onHomeClick: () => void
  onDayClick: (date: string) => void
  allData: AllData
}) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()
  
  const [viewYear, setViewYear] = useState(currentYear)
  const [viewMonth, setViewMonth] = useState(currentMonth)
  
  const daysOfWeek = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
  
  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDayOffset = getFirstDayOfMonth(viewYear, viewMonth)
  
  const minDate = new Date(currentYear, currentMonth - 5, 1)
  const canGoBack = new Date(viewYear, viewMonth, 1) > minDate
  const canGoForward = viewYear < currentYear || (viewYear === currentYear && viewMonth < currentMonth)
  
  const daysWithEntries = useMemo(() => {
    const days = new Set<number>()
    Object.keys(allData).forEach(key => {
      const [year, month, day] = key.split("-").map(Number)
      if (year === viewYear && month === viewMonth + 1) {
        days.add(day)
      }
    })
    return days
  }, [allData, viewYear, viewMonth])

  const goToPrevMonth = () => {
    if (canGoBack) {
      if (viewMonth === 0) {
        setViewYear(viewYear - 1)
        setViewMonth(11)
      } else {
        setViewMonth(viewMonth - 1)
      }
    }
  }

  const goToNextMonth = () => {
    if (canGoForward) {
      if (viewMonth === 11) {
        setViewYear(viewYear + 1)
        setViewMonth(0)
      } else {
        setViewMonth(viewMonth + 1)
      }
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <header className="bg-gradient-to-r from-sky-400 via-sky-500 to-cyan-500 text-white py-4 px-4 shadow-lg">
        <div className="max-w-md mx-auto flex items-center">
          <button onClick={onHomeClick} type="button" className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <ChevronLeft size={24} />
          </button>
          <div className="flex-1 flex items-center justify-center gap-2 pr-10">
            <span className="text-3xl drop-shadow-md">💧</span>
            <h1 className="text-2xl font-black tracking-tight drop-shadow-md">PEE-APP</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 pb-24">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-3xl shadow-xl p-4 border border-slate-200">
            <div className="flex items-center justify-center mb-4">
              <button
                type="button"
                onClick={goToPrevMonth}
                disabled={!canGoBack}
                className={`p-2 rounded-full transition-colors ${canGoBack ? "hover:bg-slate-100 text-slate-700" : "text-slate-300 cursor-not-allowed"}`}
              >
                <ChevronLeft size={24} />
              </button>
              <h2 className="text-center text-xl font-bold text-slate-800 mx-4 min-w-[160px]">
                {monthNames[viewMonth]} {viewYear}
              </h2>
              <button
                type="button"
                onClick={goToNextMonth}
                disabled={!canGoForward}
                className={`p-2 rounded-full transition-colors ${canGoForward ? "hover:bg-slate-100 text-slate-700" : "text-slate-300 cursor-not-allowed"}`}
              >
                <ChevronRight size={24} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {daysOfWeek.map((day) => (
                <div key={day} className="text-center text-xs font-bold text-slate-400 py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {[...Array(firstDayOffset)].map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              {[...Array(daysInMonth)].map((_, i) => {
                const day = i + 1
                const hasEntry = daysWithEntries.has(day)
                const isToday = viewYear === currentYear && viewMonth === currentMonth && day === now.getDate()
                const dateKey = `${viewYear}-${(viewMonth + 1).toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => hasEntry && onDayClick(dateKey)}
                    disabled={!hasEntry}
                    className={`aspect-square rounded-xl flex items-center justify-center text-sm font-bold transition-all ${
                      hasEntry ? "hover:scale-110 cursor-pointer" : "cursor-default"
                    } ${
                      isToday
                        ? "bg-gradient-to-br from-cyan-400 to-sky-500 text-white shadow-lg ring-2 ring-cyan-300"
                        : hasEntry
                          ? "bg-gradient-to-br from-sky-400 to-sky-500 text-white shadow-md"
                          : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-200 py-4 shadow-2xl">
        <div className="flex justify-center">
          <button
            onClick={onHomeClick}
            type="button"
            className="bg-gradient-to-br from-slate-500 to-slate-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 active:scale-95"
          >
            <Home size={28} />
          </button>
        </div>
      </nav>
    </div>
  )
}

function DayDetailScreen({
  date,
  data,
  onBack,
}: {
  date: string
  data: DayData
  onBack: () => void
}) {
  const dateObj = new Date(date)
  const formattedDate = dateObj.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <MainScreen
      data={data}
      title={formattedDate}
      onBack={onBack}
      showStats
      showAddButtons={false}
    />
  )
}

export default function PeeApp() {
  const [screen, setScreen] = useState<"main" | "calendar" | "day" | "addDrink" | "addPee">("main")
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [allData, setAllData] = useState<AllData>(defaultData)
  const [isLoaded, setIsLoaded] = useState(false)

  const [pendingDelete, setPendingDelete] = useState<
    | { kind: "drink"; id: number; dateKey: string }
    | { kind: "pee"; id: number; dateKey: string }
    | null
  >(null)

  const [editState, setEditState] = useState<
    | { kind: "drink"; entry: DrinkEntry; dateKey: string }
    | { kind: "pee"; entry: PeeEntry; dateKey: string }
    | null
  >(null)

  const todayKey = getTodayKey()

  // Load data from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setAllData(JSON.parse(stored))
      } catch {
        setAllData(defaultData)
      }
    }
    setIsLoaded(true)
  }, [])

  // Save data to localStorage whenever it changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allData))
    }
  }, [allData, isLoaded])

  const todayData = allData[todayKey] || { drinks: [], pees: [] }

  const handleSaveDrink = (entry: Omit<DrinkEntry, "id">) => {
    setAllData((prev) => {
      const dateKey = editState?.kind === "drink" ? editState.dateKey : todayKey
      const existing = prev[dateKey] || { drinks: [], pees: [] }

      if (editState?.kind === "drink") {
        const updated: DrinkEntry = { ...entry, id: editState.entry.id }
        return {
          ...prev,
          [dateKey]: {
            ...existing,
            drinks: existing.drinks.map((d) => (d.id === editState.entry.id ? updated : d)),
          },
        }
      }

      const newEntry: DrinkEntry = { ...entry, id: Date.now() }
      return {
        ...prev,
        [todayKey]: {
          drinks: [...(prev[todayKey]?.drinks || []), newEntry],
          pees: prev[todayKey]?.pees || [],
        },
      }
    })
    setEditState(null)
  }

  const handleSavePee = (entry: Omit<PeeEntry, "id">) => {
    setAllData((prev) => {
      const dateKey = editState?.kind === "pee" ? editState.dateKey : todayKey
      const existing = prev[dateKey] || { drinks: [], pees: [] }

      if (editState?.kind === "pee") {
        const updated: PeeEntry = { ...entry, id: editState.entry.id }
        return {
          ...prev,
          [dateKey]: {
            ...existing,
            pees: existing.pees.map((p) => (p.id === editState.entry.id ? updated : p)),
          },
        }
      }

      const newEntry: PeeEntry = { ...entry, id: Date.now() }
      return {
        ...prev,
        [todayKey]: {
          drinks: prev[todayKey]?.drinks || [],
          pees: [...(prev[todayKey]?.pees || []), newEntry],
        },
      }
    })
    setEditState(null)
  }

  const confirmDelete = () => {
    if (!pendingDelete) return
    setAllData((prev) => {
      const existing = prev[pendingDelete.dateKey] || { drinks: [], pees: [] }
      if (pendingDelete.kind === "drink") {
        return {
          ...prev,
          [pendingDelete.dateKey]: {
            ...existing,
            drinks: existing.drinks.filter((d) => d.id !== pendingDelete.id),
          },
        }
      }
      return {
        ...prev,
        [pendingDelete.dateKey]: {
          ...existing,
          pees: existing.pees.filter((p) => p.id !== pendingDelete.id),
        },
      }
    })
    setPendingDelete(null)
  }

  if (!isLoaded) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 items-center justify-center">
        <span className="text-4xl mb-4">💧</span>
        <span className="text-slate-500 font-semibold">Loading...</span>
      </div>
    )
  }

  if (screen === "addDrink") {
    const initial = editState?.kind === "drink" ? editState.entry : undefined
    return (
      <>
        <AddDrinkScreen
          onBack={() => {
            setEditState(null)
            setScreen("main")
          }}
          onSave={handleSaveDrink}
          initial={
            initial
              ? {
                  emoji: initial.emoji,
                  type: initial.type,
                  time: initial.time,
                  amount: initial.amount,
                }
              : undefined
          }
          isEditing={!!initial}
        />
      </>
    )
  }

  if (screen === "addPee") {
    const initial = editState?.kind === "pee" ? editState.entry : undefined
    return (
      <>
        <AddPeeScreen
          onBack={() => {
            setEditState(null)
            setScreen("main")
          }}
          onSave={handleSavePee}
          initial={
            initial
              ? {
                  emoji: initial.emoji,
                  time: initial.time,
                  size: initial.size,
                }
              : undefined
          }
          isEditing={!!initial}
        />
      </>
    )
  }

  if (screen === "calendar") {
    return (
      <CalendarScreen
        onHomeClick={() => setScreen("main")}
        onDayClick={(date) => {
          setSelectedDate(date)
          setScreen("day")
        }}
        allData={allData}
      />
    )
  }

  if (screen === "day") {
    const data = allData[selectedDate] || { drinks: [], pees: [] }
    return <DayDetailScreen date={selectedDate} data={data} onBack={() => setScreen("calendar")} />
  }

  return (
    <>
      <DeleteConfirmModal
        open={!!pendingDelete}
        title={pendingDelete?.kind === "drink" ? "Delete drink?" : "Delete pee?"}
        description="This can’t be undone."
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />

      <MainScreen
        data={todayData}
        onCalendarClick={() => setScreen("calendar")}
        onAddDrink={() => {
          setEditState(null)
          setScreen("addDrink")
        }}
        onAddPee={() => {
          setEditState(null)
          setScreen("addPee")
        }}
        onRequestDeleteDrink={(id) => setPendingDelete({ kind: "drink", id, dateKey: todayKey })}
        onRequestEditDrink={(entry) => {
          setPendingDelete(null)
          setEditState({ kind: "drink", entry, dateKey: todayKey })
          setScreen("addDrink")
        }}
        onRequestDeletePee={(id) => setPendingDelete({ kind: "pee", id, dateKey: todayKey })}
        onRequestEditPee={(entry) => {
          setPendingDelete(null)
          setEditState({ kind: "pee", entry, dateKey: todayKey })
          setScreen("addPee")
        }}
      />
    </>
  )
}
