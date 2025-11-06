#!/usr/bin/env python3
"""
Script Python para gerar ícone de app com safe padding de 20%

Requisitos:
    pip install Pillow

Uso:
    python scripts/generate-icon.py
"""

from PIL import Image
import os
import sys

OUTPUT_SIZE = 512  # Tamanho final do ícone
SAFE_PADDING_PERCENT = 0.20  # 20% de padding
INPUT_FILES = [
    '../assets/logo.jpeg',
    '../assets/icon.png',
    '../assets/splash-icon.png',
]
OUTPUT_FILE = '../assets/icon.png'

def generate_icon():
    try:
        # Encontrar arquivo de entrada válido
        script_dir = os.path.dirname(os.path.abspath(__file__))
        input_file = None
        
        for file_path in INPUT_FILES:
            full_path = os.path.join(script_dir, file_path)
            if os.path.exists(full_path):
                input_file = full_path
                print(f'✓ Arquivo encontrado: {input_file}')
                break
        
        if not input_file:
            raise FileNotFoundError('Nenhum arquivo de entrada encontrado. Verifique se existe logo.jpeg, icon.png ou splash-icon.png em assets/')
        
        # Carregar imagem original
        image = Image.open(input_file)
        original_width, original_height = image.size
        
        print(f'✓ Imagem original: {original_width}x{original_height}px')
        print(f'✓ Formato: {image.format}')
        
        # Converter para RGBA preservando todos os pixels (incluindo brancos)
        if image.mode != 'RGBA':
            # Converter RGB para RGBA mantendo todos os pixels visíveis (alpha=255)
            if image.mode == 'RGB':
                # Criar nova imagem RGBA e colar o RGB com alpha total
                rgba_image = Image.new('RGBA', image.size)
                rgba_image.paste(image, (0, 0))
                image = rgba_image
            else:
                image = image.convert('RGBA')
        
        # Calcular tamanho da área segura (80% do tamanho total)
        safe_area_size = int(OUTPUT_SIZE * (1 - SAFE_PADDING_PERCENT * 2))
        padding = int(OUTPUT_SIZE * SAFE_PADDING_PERCENT)
        
        print(f'✓ Área segura: {safe_area_size}x{safe_area_size}px')
        print(f'✓ Padding: {padding}px em cada lado')
        
        # Redimensionar imagem para caber na área segura mantendo proporção
        original_aspect_ratio = original_width / original_height
        
        if original_aspect_ratio > 1:
            # Imagem é mais larga que alta
            target_width = safe_area_size
            target_height = int(safe_area_size / original_aspect_ratio)
        else:
            # Imagem é mais alta que larga ou quadrada
            target_height = safe_area_size
            target_width = int(safe_area_size * original_aspect_ratio)
        
        print(f'✓ Redimensionando para: {target_width}x{target_height}px (mantendo proporção)')
        
        # Redimensionar imagem
        resized_image = image.resize((target_width, target_height), Image.Resampling.LANCZOS)
        
        # Criar canvas transparente de 512x512
        canvas = Image.new('RGBA', (OUTPUT_SIZE, OUTPUT_SIZE), (0, 0, 0, 0))
        
        # Calcular posição para centralizar
        offset_x = (OUTPUT_SIZE - target_width) // 2
        offset_y = (OUTPUT_SIZE - target_height) // 2
        
        print(f'✓ Posicionando em: x={offset_x}, y={offset_y}')
        
        # Colar a imagem redimensionada no centro do canvas
        # Não usar máscara para preservar todos os pixels incluindo brancos
        canvas.paste(resized_image, (offset_x, offset_y))
        
        # Salvar arquivo
        output_path = os.path.join(script_dir, OUTPUT_FILE)
        canvas.save(output_path, 'PNG')
        
        print(f'\n✅ Ícone gerado com sucesso!')
        print(f'   Arquivo: {output_path}')
        print(f'   Tamanho: {OUTPUT_SIZE}x{OUTPUT_SIZE}px')
        print(f'   Formato: PNG com fundo transparente')
        print(f'   Padding seguro: {int(SAFE_PADDING_PERCENT * 100)}%')
        
        # Verificar se o arquivo foi criado corretamente
        verify_image = Image.open(output_path)
        verify_width, verify_height = verify_image.size
        print(f'\n✓ Verificação: Arquivo criado com {verify_width}x{verify_height}px')
        
    except ImportError:
        print('\n❌ Erro: Pillow não está instalado.')
        print('   Instale com: pip install Pillow')
        sys.exit(1)
    except Exception as error:
        print(f'\n❌ Erro ao gerar ícone: {error}')
        sys.exit(1)

if __name__ == '__main__':
    generate_icon()

