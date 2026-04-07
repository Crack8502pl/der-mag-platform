#!/bin/bash

echo "=== DER-MAG Platform - Monitor RAM ==="
echo ""
echo "Procesy Node.js (TOP 10):"
ps aux --sort=-%mem | grep -E 'node|ts-node|tsx|vite|npm' | grep -v grep | head -10

echo ""
echo "=== Suma RAM (Node.js) ==="
ps aux | grep -E 'node|ts-node|tsx|vite' | grep -v grep | awk '{sum+=$6} END {print "Total: " sum/1024 " MB"}'

echo ""
echo "=== PostgreSQL RAM ==="
ps aux | grep postgres | grep -v grep | awk '{sum+=$6} END {print "Total: " sum/1024 " MB"}'

echo ""
echo "=== System Memory ==="
free -h
