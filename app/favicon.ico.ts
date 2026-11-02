// Standard edge-runtime asset generation or fallback route to verify Next build checks
export const dynamic = 'force-static';
export function GET() {
  return new Response();
}
