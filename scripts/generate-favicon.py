#!/usr/bin/env python3
"""
Script Python para gerar favicon para web

Requisitos:
    pip install Pillow

Uso:
    python scripts/generate-favicon.py
"""

from PIL import Image
import os
import sys

OUTPUT_SIZE = 32  # Tamanho do favicon
INPUT_FILE = '../assets/icon.png'
OUTPUT_FILE = '../assets/favicon.png'

def generate_favicon():
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
        
        # Converter para RGBA se necessário
        if image.mode != 'RGBA':
            image = image.convert('RGBA')
        
        # Redimensionar para 32x32
        resized_image = image.resize((OUTPUT_SIZE, OUTPUT_SIZE), Image.Resampling.LANCZOS)
        
        # Salvar arquivo
        output_path = os.path.join(script_dir, OUTPUT_FILE)
        resized_image.save(output_path, 'PNG')
        
        print(f'\n✅ Favicon gerado com sucesso!')
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
        print(f'\n❌ Erro ao gerar favicon: {error}')
        sys.exit(1)

if __name__ == '__main__':
    generate_favicon()

