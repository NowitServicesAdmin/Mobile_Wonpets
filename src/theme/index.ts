// Kept only for places that need raw hex values (icon colors, gradients, native props).
// Everything else uses Tailwind classes defined in tailwind.config.js.
export const colors = {
  primary: '#FF6B00', primaryDark: '#E85D00', primarySoft: '#FFF1E3', bg: '#FFF9F2',
  text: '#1F1B16', muted: '#7A7068', border: '#F6E3D0',
  ink: '#13213F', primaryLight: '#FF9A1F', surface: '#FFFFFF', borderSoft: '#F3DFD0',
  purple: '#7C3AED', green: '#16A34A', red: '#EF4444', blue: '#3B82F6', pink: '#EC4899', yellow: '#F5B301',
};


/** Premium look shared by every screen: warm orange-tinted shadows + the brand gradient. */
export const gradients = {
  primary: ['#FF9A1F', '#FF6B00'] as [string, string],
  screen: ['#FFF1E4', '#FFF9F3', '#FFF3E8'] as [string, string, string],
};
export const shadows = {
  card: { shadowColor: '#C2410C', shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  float: { shadowColor: '#7C2D12', shadowOpacity: 0.16, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 10 },
  button: { shadowColor: '#FF6B00', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
};