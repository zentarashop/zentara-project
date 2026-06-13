// ZENTARA Command Center — Data Layer & Color Tokens  v1.0

window.ZC = {
  bg:      '#0a0a12',
  surface: '#0a0b18',
  card:    '#0f1020',
  text:    '#e0e0e8',
  sub:     '#9ca3af',
  muted:   '#6b7280',
  dim:     '#4b5563',
  green:   '#2dff7a',
  gold:    '#ffd23f',
  pink:    '#ff4fa3',
  purple:  '#9b5cff',
  blue:    '#3da9fc',
  orange:  '#ff9d4d',
  red:     '#ff4757',
};

window.ZD = {
  kpis: {
    ordersToday: 0, ordersTrend: '—',
  },
  decisionQueue: [],
  activityFeed: [],
  schedule: [
    { time:'07:00', agent:'Poduch',  task:'morning-brief-product', color:'#3da9fc' },
    { time:'07:30', agent:'Tsuki',   task:'morning-brief',          color:'#ff4fa3' },
    { time:'08:00', agent:'Magrace', task:'activity-monitor',       color:'#9b5cff' },
    { time:'09:00', agent:'Opal',    task:'order-tracker',          color:'#ff9d4d' },
    { time:'10:00', agent:'Opal',    task:'lead-followup DM',       color:'#ff9d4d' },
    { time:'12:00', agent:'Opal',    task:'lead-followup DM',       color:'#ff9d4d' },
    { time:'14:00', agent:'Opal',    task:'lead-followup DM',       color:'#ff9d4d' },
    { time:'15:00', agent:'Tsuki',   task:'brand-guardian review',  color:'#ff4fa3' },
  ],
  tsukiInbox: [],
  performance: { igFollowers:'—', igReach:'—', igEngagement:'—', ttViews:'—' },
  collections: [],
  stockAlerts: [],
  orders: [],
  dmInbox: [],
};
