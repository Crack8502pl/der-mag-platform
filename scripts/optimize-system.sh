#!/bin/bash

echo "=== Optymalizacja swappiness dla der-mag-platform ==="

# Sprawdź obecną wartość
current=$(cat /proc/sys/vm/swappiness)
echo "Obecny swappiness: $current"

# Ustaw swappiness na 10 (mniej agresywny swap)
if [ "$current" != "10" ]; then
    echo "Ustawiam swappiness na 10..."
    sudo sysctl vm.swappiness=10
    if ! grep -q "^vm.swappiness=" /etc/sysctl.conf; then
        echo "vm.swappiness=10" | sudo tee -a /etc/sysctl.conf
    else
        sudo sed -i 's/^vm.swappiness=.*/vm.swappiness=10/' /etc/sysctl.conf
    fi
    echo "✅ Swappiness zaktualizowany"
else
    echo "✅ Swappiness już ustawiony optymalnie"
fi

# Optymalizacja vm.vfs_cache_pressure
echo ""
echo "Optymalizacja vfs_cache_pressure..."
sudo sysctl vm.vfs_cache_pressure=50
if ! grep -q "^vm.vfs_cache_pressure=" /etc/sysctl.conf; then
    echo "vm.vfs_cache_pressure=50" | sudo tee -a /etc/sysctl.conf
else
    sudo sed -i 's/^vm.vfs_cache_pressure=.*/vm.vfs_cache_pressure=50/' /etc/sysctl.conf
fi

echo ""
echo "✅ Optymalizacja systemu zakończona!"
