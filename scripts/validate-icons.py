#!/usr/bin/env python3
"""
Script para validar se os ícones estão correctos

Verifica:
- Tamanhos corretos
- Formato RGBA para transparência
- Existência dos arquivos
"""

from PIL import Image
import os

REQUIRED_ICONS = {
    'icon.png': (512, 512),
    'adaptive-icon.png': (1024, 1024),
    'favicon.png': (32, 32),
}

def validate_icons():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    assets_dir = os.path.join(script_dir, '../assets')
    
    print('🔍 Validando ícones...\n')
    
    all_valid = True
    
    for filename, expected_size in REQUIRED_ICONS.items():
        filepath = os.path.join(assets_dir, filename)
        
        if not os.path.exists(filepath):
            print(f'❌ {filename}: Arquivo não encontrado!')
            all_valid = False
            continue
        
        try:
            img = Image.open(filepath)
            actual_size = img.size
            mode = img.mode
            
            size_ok = actual_size == expected_size
            rgba_ok = mode == 'RGBA'
            
            status = '✅' if (size_ok and rgba_ok) else '⚠️'
            
            print(f'{status} {filename}:')
            print(f'   Tamanho: {actual_size[0]}x{actual_size[1]}px (esperado: {expected_size[0]}x{expected_size[1]}px)')
            print(f'   Formato: {mode} {"✅" if rgba_ok else "❌ (deveria ser RGBA)"}')
            
            if not size_ok:
                print(f'   ⚠️  Tamanho incorreto!')
                all_valid = False
            if not rgba_ok:
                print(f'   ⚠️  Deveria ser RGBA para suportar transparência!')
                all_valid = False
            print()
            
        except Exception as e:
            print(f'❌ {filename}: Erro ao validar - {e}')
            all_valid = False
    
    if all_valid:
        print('✅ Todos os ícones estão válidos!')
    else:
        print('⚠️  Alguns ícones precisam ser regenerados.')
        print('   Execute: python scripts/generate-icon.py')
        print('   Depois: python scripts/generate-adaptive-icon.py')
        print('   E por fim: python scripts/generate-favicon.py')
    
    return all_valid

if __name__ == '__main__':
    validate_icons()

