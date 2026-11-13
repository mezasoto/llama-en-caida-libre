import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowDownUp,
  ArrowUpRight,
  CircleHelp,
  Database,
  FlaskConical,
  Flame,
  Radio,
  Search,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import './App.css'

type Experiment = {
  id: string
  title: string
  type: string
  fuel: string
  flameIndex: number
  ignitionDelay: number
  burnTime: number
}

type TelemetryRecord = {
  id: number
  device_id: string
  temperature_c: number
  smoke_ppm: number
  flame_detected: boolean
  created_at: string
}

type TelemetryStatus = 'loading' | 'online' | 'empty' | 'offline'

// En producción, la API comparte dominio con React. En desarrollo usa el backend local.
const apiBaseUrl = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '')).replace(/\/$/, '')

const experiments: Experiment[] = [
  {
    id: 'DEMO-01',
    title: 'Caso A · llama de difusión',
    type: 'Difusión',
    fuel: 'Mezcla A',
    flameIndex: 32,
    ignitionDelay: 1.8,
    burnTime: 18,
  },
  {
    id: 'DEMO-02',
    title: 'Caso B · gota de combustible',
    type: 'Gota',
    fuel: 'Mezcla B',
    flameIndex: 44,
    ignitionDelay: 2.4,
    burnTime: 25,
  },
  {
    id: 'DEMO-03',
    title: 'Caso C · material sólido',
    type: 'Sólido',
    fuel: 'Material C',
    flameIndex: 25,
    ignitionDelay: 1.2,
    burnTime: 14,
  },
]

function App() {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('Todos')
  const [selectedIds, setSelectedIds] = useState(['DEMO-01', 'DEMO-02'])
  const [telemetry, setTelemetry] = useState<TelemetryRecord[]>([])
  const [telemetryStatus, setTelemetryStatus] = useState<TelemetryStatus>('loading')

  useEffect(() => {
    let isCurrent = true

    const loadTelemetry = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/telemetry`)
        if (!response.ok) throw new Error('Telemetry API request failed')

        const result = (await response.json()) as { data?: TelemetryRecord[] }
        if (!Array.isArray(result.data)) throw new Error('Unexpected telemetry response')
