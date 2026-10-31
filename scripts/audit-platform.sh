#!/usr/bin/env bash
set -e

BASE_URL="https://www.veroyx.com"
FAILED=0
PASSED=0

echo "=========================================================="
echo "          VEROYX 10/10 PRODUCTION DEPLOYMENT AUDIT        "
echo "=========================================================="
echo "Auditing: $BASE_URL"
echo ""

check_route() {
  local route="$1"
  local expected="$2"
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$route")

  if [ "$status" -eq "$expected" ]; then
    echo "  [PASS] $route -> HTTP $status"
    PASSED=$((PASSED + 1))
  else
    echo "  [FAIL] $route -> Expected HTTP $expected, got $status"
    FAILED=$((FAILED + 1))
  fi
}

echo "1. VERIFYING CORE ENGINES & HUBS..."
check_route "/" 200
check_route "/mission-builder" 200
check_route "/visualizer" 200
check_route "/telemetry" 200
check_route "/compliance" 200
check_route "/briefing" 200
check_route "/developers" 200
check_route "/launches" 200
check_route "/companies" 200
check_route "/companies/spacex" 200
check_route "/companies/rocket-lab" 200
check_route "/contracts" 200
check_route "/technologies" 200
check_route "/technologies/hall-effect-thruster" 200
check_route "/technologies/1550nm-lasercom" 200
check_route "/cost" 200
check_route "/adcs" 200
check_route "/link" 200
check_route "/optical-payload" 200
check_route "/sar" 200
check_route "/lasercom" 200
check_route "/conjunction" 200
check_route "/reentry-footprint" 200
check_route "/vibe" 200
check_route "/mmod" 200
check_route "/eps" 200
check_route "/battery" 200
check_route "/two-phase" 200

echo ""
echo "2. VERIFYING CANONICAL 308 REDIRECTS..."
check_route "/rf" 308
check_route "/passes" 308
check_route "/radiation" 308
check_route "/payload" 308
check_route "/optical" 308
check_route "/ground-stations" 308

echo ""
echo "3. VERIFYING HEADLESS MATHEMATICAL CALCULATION APIs..."

# API 1: Propagator
PROP_RES=$(curl -s -X POST "$BASE_URL/api/v1/propagate" \
  -H "Content-Type: application/json" \
  -d '{"semi_major_axis_km": 6928.14, "inclination_deg": 51.64}')

if echo "$PROP_RES" | grep -q '"status":"SUCCESS"'; then
  echo "  [PASS] /api/v1/propagate -> Valid Calculation Payload"
  PASSED=$((PASSED + 1))
else
  echo "  [FAIL] /api/v1/propagate -> Invalid Output: $PROP_RES"
  FAILED=$((FAILED + 1))
fi

# API 2: Link Budget
LINK_RES=$(curl -s -X POST "$BASE_URL/api/v1/link-budget" \
  -H "Content-Type: application/json" \
  -d '{"carrier_frequency_ghz": 8.45, "tx_power_watts": 10.0}')

if echo "$LINK_RES" | grep -q '"free_space_path_loss_db"'; then
  echo "  [PASS] /api/v1/link-budget -> Valid Calculation Payload"
  PASSED=$((PASSED + 1))
else
  echo "  [FAIL] /api/v1/link-budget -> Invalid Output: $LINK_RES"
  FAILED=$((FAILED + 1))
fi

# API 3: Foster Conjunction
CONJ_RES=$(curl -s -X POST "$BASE_URL/api/v1/conjunction-eval" \
  -H "Content-Type: application/json" \
  -d '{"miss_distance_m": 85.0, "primary_hbr_m": 2.2}')

if echo "$CONJ_RES" | grep -q '"collision_probability_pc"'; then
  echo "  [PASS] /api/v1/conjunction-eval -> Valid Calculation Payload"
  PASSED=$((PASSED + 1))
else
  echo "  [FAIL] /api/v1/conjunction-eval -> Invalid Output: $CONJ_RES"
  FAILED=$((FAILED + 1))
fi

echo ""
echo "=========================================================="
echo "AUDIT SUMMARY: $PASSED PASSED, $FAILED FAILED"
echo "=========================================================="

if [ "$FAILED" -eq 0 ]; then
  echo "PLATFORM IS 100% OPERATIONAL & READY FOR NASA BRIEFINGS."
  exit 0
else
  echo "ACTION REQUIRED: Please address failed routes above."
  exit 1
fi
