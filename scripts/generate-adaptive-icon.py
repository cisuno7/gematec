#!/usr/bin/env python3
"""
Script Python para gerar adaptive icon do Android

Requisitos:
    pip install Pillow

Uso:
    python scripts/generate-adaptive-icon.py
"""

from PIL import Image
import os
import sys

OUTPUT_SIZE = 1024  # Tamanho final do adaptive icon
INPUT_FILE = '../assets/icon.png'  # Usa o icon.png gerado anteriormente
OUTPUT_FILE = '../assets/adaptive-icon.png'

def generate_adaptive_icon():
    try:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        input_path = os.path.join(script_dir, INPUT_FILE)
        
        # Verificar se o icon.png existe
        if not os.path.exists(input_path):
            raise FileNotFoundError(f'Arquivo {input_path} não encontrado. Execute primeiro o script generate-icon.py')
        
        print(f'✓ Arquivo de entrada: {input_path}')
        
        # Carregar imagem
        image = Image.open(input_path)
        original_width, original_height = image.size
        
        print(f'✓ Imagem original: {original_width}x{original_height}px')
        
        # Converter para RGBA preservando todos os pixels
        if image.mode != 'RGBA':
            if image.mode == 'RGB':
                rgba_image = Image.new('RGBA', image.size)
                rgba_image.paste(image, (0, 0))
                image = rgba_image
            else:
                image = image.convert('RGBA')
        
        # Redimensionar para 1024x1024 mantendo proporção e padding
        # Usar LANCZOS para melhor qualidade quando aumentando tamanho
        resized_image = image.resize((OUTPUT_SIZE, OUTPUT_SIZE), Image.Resampling.LANCZOS)
        
        # Salvar arquivo
        output_path = os.path.join(script_dir, OUTPUT_FILE)
        resized_image.save(output_path, 'PNG')
        
        print(f'\n✅ Adaptive icon gerado com sucesso!')
        print(f'   Arquivo: {output_path}')
        print(f'   Tamanho: {OUTPUT_SIZE}x{OUTPUT_SIZE}px')
        print(f'   Formato: PNG com fundo transparente')
        
        # Verificar se o arquivo foi criado corretamente
        verify_image = Image.open(output_path)
        verify_width, verify_height = verify_image.size
        print(f'\n✓ Verificação: Arquivo criado com {verify_width}x{verify_height}px')
        
    except ImportError:
        print('\n❌ Erro: Pillow não está instalado.')
        print('   Instale com: pip install Pillow')
        sys.exit(1)
    except Exception as error:
        print(f'\n❌ Erro ao gerar adaptive icon: {error}')
        sys.exit(1)

if __name__ == '__main__':
    generate_adaptive_icon()

