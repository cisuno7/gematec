import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    FlatList,
    TextInput,
    Platform,
    Pressable,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useResponsive } from '../hooks/useResponsive';

interface CustomPickerProps {
    selectedValue: any;
    onValueChange: (value: any) => void;
    items: Array<{ label: string; value: any }>;
    placeholder?: string;
    style?: any;
    searchable?: boolean;
    enabled?: boolean;
}

const CustomPicker: React.FC<CustomPickerProps> = ({
                                                           selectedValue,
                                                           onValueChange,
                                                           items,
                                                           placeholder = "Selecione uma opção",
                                                           style,
                                                           searchable = true, // Por padrão, ter busca
                                                           enabled = true,
                                                       }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const r = useResponsive();
    const SCREEN_WIDTH = r?.width ?? 414;
    const SCREEN_HEIGHT = r?.height ?? 896;
    const fontScale = r?.fontScale ?? 1;

    // Limitar crescimento da fonte para evitar problemas
    const maxFontScale = 1.3;
    const effectiveFontScale = Math.min(fontScale, maxFontScale);

    // Tamanhos base
    const baseFontSize = 14;
    const baseItemFontSize = 16;

    // Fontes escaladas
    const scaledFontSize = baseFontSize * effectiveFontScale;
    const scaledItemFontSize = baseItemFontSize * effectiveFontScale;

    // Alturas com controle total
    const buttonHeight = Math.max(50, scaledFontSize * 3.5);
    const itemHeight = Math.max(56, scaledItemFontSize * 3.5);

    // Filtrar itens baseado na busca
    const filteredItems = items.filter(item =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Encontrar o item selecionado
    const selectedItem = items.find(item => item.value === selectedValue);
    const displayText = selectedItem ? selectedItem.label : placeholder;
    const isPlaceholder = !selectedItem;

    const handleSelect = (value: any) => {
        onValueChange(value);
        setIsVisible(false);
        setSearchQuery(''); // Limpar busca ao selecionar
    };

    const handleClose = () => {
        setIsVisible(false);
        setSearchQuery(''); // Limpar busca ao fechar
    };

    // Truncar texto se for muito longo
    const truncateText = (text: string, maxLength: number = 40): string => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    };

    const renderItem = ({ item }: { item: { label: string; value: any } }) => {
        const isSelected = item.value === selectedValue;

        return (
            <TouchableOpacity
                style={[
                    styles.item,
                    {
                        minHeight: itemHeight,
                        paddingVertical: scaledItemFontSize * 0.8,
                    },
                    isSelected && styles.itemSelected,
                ]}
                onPress={() => handleSelect(item.value)}
                activeOpacity={0.7}
            >
                <Text
                    style={[
                        styles.itemText,
                        {
                            fontSize: scaledItemFontSize,
                            lineHeight: scaledItemFontSize * 1.4,
                        },
                        isSelected && styles.itemTextSelected,
                    ]}
                    numberOfLines={2}
                    maxFontSizeMultiplier={maxFontScale}
                >
                    {item.label}
                </Text>
                {isSelected && (
                    <MaterialIcons name="check" size={24} color="#007bff" />
                )}
            </TouchableOpacity>
        );
    };

    return (
        <>
            {/* Botão que abre o dropdown */}
            <TouchableOpacity
                style={[
                    styles.button,
                    {
                        minHeight: buttonHeight,
                        paddingVertical: scaledFontSize * 0.6,
                    },
                    !enabled && styles.buttonDisabled,
                    style,
                ]}
                onPress={() => enabled && setIsVisible(true)}
                activeOpacity={0.7}
                disabled={!enabled}
            >
                <Text
                    style={[
                        styles.buttonText,
                        {
                            fontSize: scaledFontSize,
                            lineHeight: scaledFontSize * 1.4,
                        },
                        isPlaceholder && styles.placeholderText,
                    ]}
                    numberOfLines={1}
                    maxFontSizeMultiplier={maxFontScale}
                >
                    {truncateText(displayText)}
                </Text>
                <MaterialIcons
                    name="arrow-drop-down"
                    size={24 * effectiveFontScale}
                    color={isPlaceholder ? "#999" : "#000"}
                />
            </TouchableOpacity>

            {/* Modal com a lista */}
            <Modal
                visible={isVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={handleClose}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={handleClose}
                >
                    <Pressable
                        style={[
                            styles.modalContent,
                            {
                                maxHeight: SCREEN_HEIGHT * 0.7,
                            }
                        ]}
                        onPress={(e) => e.stopPropagation()} // Evita fechar ao clicar no conteúdo
                    >
                        {/* Cabeçalho */}
                        <View style={styles.modalHeader}>
                            <Text
                                style={[
                                    styles.modalTitle,
                                    {
                                        fontSize: scaledItemFontSize * 1.1,
                                        lineHeight: scaledItemFontSize * 1.5,
                                    }
                                ]}
                                maxFontSizeMultiplier={maxFontScale}
                            >
                                {placeholder}
                            </Text>
                            <TouchableOpacity
                                onPress={handleClose}
                                style={styles.closeButton}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <MaterialIcons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        {/* Campo de busca (opcional) */}
                        {searchable && items.length > 5 && (
                            <View style={styles.searchContainer}>
                                <MaterialIcons name="search" size={20} color="#999" />
                                <TextInput
                                    style={[
                                        styles.searchInput,
                                        {
                                            fontSize: scaledFontSize,
                                            lineHeight: scaledFontSize * 1.4,
                                        }
                                    ]}
                                    placeholder="Buscar..."
                                    placeholderTextColor="#999"
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    maxFontSizeMultiplier={maxFontScale}
                                />
                                {searchQuery.length > 0 && (
                                    <TouchableOpacity
                                        onPress={() => setSearchQuery('')}
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    >
                                        <MaterialIcons name="clear" size={20} color="#999" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}

                        {/* Lista de itens */}
                        {filteredItems.length > 0 ? (
                            <FlatList
                                data={filteredItems}
                                renderItem={renderItem}
                                keyExtractor={(item, index) => `${item.value}-${index}`}
                                style={styles.list}
                                showsVerticalScrollIndicator={true}
                                keyboardShouldPersistTaps="handled"
                                initialNumToRender={10}
                                maxToRenderPerBatch={10}
                                windowSize={10}
                            />
                        ) : (
                            <View style={styles.emptyContainer}>
                                <MaterialIcons name="search-off" size={48} color="#ccc" />
                                <Text
                                    style={[
                                        styles.emptyText,
                                        {
                                            fontSize: scaledFontSize,
                                            lineHeight: scaledFontSize * 1.4,
                                        }
                                    ]}
                                    maxFontSizeMultiplier={maxFontScale}
                                >
                                    Nenhum item encontrado
                                </Text>
                            </View>
                        )}
                    </Pressable>
                </Pressable>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    // Botão principal
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        backgroundColor: '#fff',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        flex: 1,
        color: '#000',
        marginRight: 8,
    },
    placeholderText: {
        color: '#999',
        fontStyle: 'italic',
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        width: '100%',
        maxWidth: 500,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
            },
            android: {
                elevation: 8,
            },
        }),
    },

    // Cabeçalho do modal
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    modalTitle: {
        flex: 1,
        fontWeight: '600',
        color: '#333',
    },
    closeButton: {
        padding: 4,
    },

    // Campo de busca
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        backgroundColor: '#f8f9fa',
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        marginRight: 8,
        padding: 0,
        color: '#000',
    },

    // Lista
    list: {
        maxHeight: 400,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        backgroundColor: '#fff',
    },
    itemSelected: {
        backgroundColor: '#f0f8ff',
    },
    itemText: {
        flex: 1,
        color: '#333',
        marginRight: 8,
    },
    itemTextSelected: {
        color: '#007bff',
        fontWeight: '600',
    },

    // Estado vazio
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        marginTop: 12,
        color: '#999',
        textAlign: 'center',
    },
});

export default CustomPicker;