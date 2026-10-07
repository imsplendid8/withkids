#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

API_URL="${API_URL:-http://localhost:3001/api}"

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Phase 1, Task 1: 기관 & 프로그램 데이터 입력${NC}"
echo -e "${BLUE}  (Institutional & Program Data Entry)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}API Base URL: ${API_URL}${NC}"
echo ""

# Function to create institution
create_institution() {
  local name=$1
  local type=$2
  local description=$3
  local address=$4
  local website=$5
  local phone=$6

  echo -e "${BLUE}➕ Creating Institution: ${name}${NC}"

  response=$(curl -s -X POST "${API_URL}/institutions" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"${name}\",
      \"institutionType\": \"${type}\",
      \"description\": \"${description}\",
      \"address\": \"${address}\",
      \"websiteUrl\": \"${website}\",
      \"phone\": \"${phone}\",
      \"latitude\": 37.4979,
      \"longitude\": 127.0276
    }")

  # Extract ID from response
  id=$(echo "$response" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

  if [ -z "$id" ]; then
    echo -e "${RED}   ❌ Failed to create institution${NC}"
    echo -e "${RED}   Response: $response${NC}"
    return 1
  else
    echo -e "${GREEN}   ✅ Created with ID: ${id}${NC}"
    echo "$id"  # Return the ID
    return 0
  fi
}

# Function to create experience
create_experience() {
  local institutionId=$1
  local name=$2
  local category=$3
  local description=$4
  local ageMin=$5
  local ageMax=$6

  echo -e "${BLUE}   ➕ Creating Program: ${name}${NC}"

  response=$(curl -s -X POST "${API_URL}/experiences" \
    -H "Content-Type: application/json" \
    -d "{
      \"institutionId\": \"${institutionId}\",
      \"programName\": \"${name}\",
      \"experienceCategory\": \"${category}\",
      \"description\": \"${description}\",
      \"targetAgeMin\": ${ageMin},
      \"targetAgeMax\": ${ageMax},
      \"bookingMethod\": \"FIRST_COME\",
      \"isRecurring\": true
    }")

  # Extract ID from response
  id=$(echo "$response" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

  if [ -z "$id" ]; then
    echo -e "${RED}      ❌ Failed to create program${NC}"
    echo -e "${RED}      Response: $response${NC}"
    return 1
  else
    echo -e "${GREEN}      ✅ Created with ID: ${id}${NC}"
    echo "$id"  # Return the ID
    return 0
  fi
}

echo -e "${YELLOW}1️⃣  기관 정보 입력${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Create Institution 1: Science Center
inst1_id=$(create_institution \
  "DKIS 과학관" \
  "SCIENCE_CENTER" \
  "서울의 대표 과학 교육 기관으로 다양한 과학 프로그램을 제공합니다" \
  "서울시 강남구 테헤란로 123" \
  "https://science-museum.example.com" \
  "02-1234-5001")

echo ""

# Create Institution 2: Museum
inst2_id=$(create_institution \
  "DKIS 박물관" \
  "MUSEUM" \
  "한국 문화와 역사를 소개하는 박물관입니다" \
  "서울시 종로구 삼청로 37" \
  "https://art-museum.example.com" \
  "02-2222-5002")

echo ""

# Create Institution 3: Factory
inst3_id=$(create_institution \
  "DKIS 팩토리 투어" \
  "FACTORY" \
  "산업 현장 견학을 통해 제조 과정을 배우는 프로그램입니다" \
  "인천시 연수구 송도동 123-45" \
  "https://factory-tour.example.com" \
  "032-5555-5003")

echo ""
echo -e "${YELLOW}2️⃣  프로그램 정보 입력${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Create Programs for each Institution
if [ ! -z "$inst1_id" ]; then
  prog1_id=$(create_experience \
    "$inst1_id" \
    "과학 워크숍 (기초)" \
    "WORKSHOP" \
    "초등학생을 위한 기초 과학 실험 프로그램입니다" \
    "6" \
    "12")
  echo ""
fi

if [ ! -z "$inst2_id" ]; then
  prog2_id=$(create_experience \
    "$inst2_id" \
    "전시 관람 투어" \
    "EXHIBITION" \
    "가이드와 함께하는 박물관 전시 관람 프로그램입니다" \
    "5" \
    "18")
  echo ""
fi

if [ ! -z "$inst3_id" ]; then
  prog3_id=$(create_experience \
    "$inst3_id" \
    "팩토리 투어 프로그램" \
    "FACTORY_TOUR" \
    "산업 현장 방문을 통한 직업 체험 프로그램입니다" \
    "10" \
    "18")
  echo ""
fi

# Summary
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  📊 Data Seeding Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

success_count=0
if [ ! -z "$inst1_id" ]; then
  echo -e "${GREEN}✅ Institution 1 (과학관): ${inst1_id}${NC}"
  ((success_count++))
else
  echo -e "${RED}❌ Institution 1 (과학관): Failed${NC}"
fi

if [ ! -z "$inst2_id" ]; then
  echo -e "${GREEN}✅ Institution 2 (박물관): ${inst2_id}${NC}"
  ((success_count++))
else
  echo -e "${RED}❌ Institution 2 (박물관): Failed${NC}"
fi

if [ ! -z "$inst3_id" ]; then
  echo -e "${GREEN}✅ Institution 3 (팩토리): ${inst3_id}${NC}"
  ((success_count++))
else
  echo -e "${RED}❌ Institution 3 (팩토리): Failed${NC}"
fi

echo ""

prog_count=0
if [ ! -z "$prog1_id" ]; then
  echo -e "${GREEN}✅ Program 1 (과학 워크숍): ${prog1_id}${NC}"
  ((prog_count++))
else
  echo -e "${RED}❌ Program 1 (과학 워크숍): Failed${NC}"
fi

if [ ! -z "$prog2_id" ]; then
  echo -e "${GREEN}✅ Program 2 (전시 관람): ${prog2_id}${NC}"
  ((prog_count++))
else
  echo -e "${RED}❌ Program 2 (전시 관람): Failed${NC}"
fi

if [ ! -z "$prog3_id" ]; then
  echo -e "${GREEN}✅ Program 3 (팩토리 투어): ${prog3_id}${NC}"
  ((prog_count++))
else
  echo -e "${RED}❌ Program 3 (팩토리 투어): Failed${NC}"
fi

echo ""
echo -e "${BLUE}Institutions: ${success_count}/3 created${NC}"
echo -e "${BLUE}Programs: ${prog_count}/3 created${NC}"

# Verify data
echo ""
echo -e "${YELLOW}📋 Verifying Data...${NC}"
echo ""

inst_count=$(curl -s "${API_URL}/institutions" | grep -o '"id"' | wc -l)
exp_count=$(curl -s "${API_URL}/experiences" | grep -o '"id"' | wc -l)

echo -e "${BLUE}Total Institutions in Database: ${inst_count}${NC}"
echo -e "${BLUE}Total Experiences in Database: ${exp_count}${NC}"

echo ""
if [ $success_count -eq 3 ] && [ $prog_count -eq 3 ]; then
  echo -e "${GREEN}✅ Phase 1, Task 1 Complete!${NC}"
  echo -e "${GREEN}All institutional and program data has been successfully entered.${NC}"
  exit 0
else
  echo -e "${YELLOW}⚠️  Some entries failed. Please check the API response above.${NC}"
  exit 1
fi
