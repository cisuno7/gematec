// file: src/Services/MenuService.ts
import apiClient from "../Context/ApiClient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MenuItem } from "../Models/MenuItem";

export default class MenuService {
    private static menuCache: MenuItem[] | null = null;
    private static lastFetchAttempt: number = 0;
    private static readonly RETRY_DELAY = 60000; // 1 minuto entre tentativas

    static async fetchDynamicMenu(): Promise<MenuItem[]> {
        try {
            const accessToken = await AsyncStorage.getItem("access_token");
            const account = await AsyncStorage.getItem("account");
            console.log("[MenuService] Tokens presentes?", { hasAccess: !!accessToken, hasAccount: !!account });
            if (!accessToken || !account) {
                // Evitar erro na primeira montagem; retorna menu vazio e deixa Drawer exibir loading/placeholder
                console.warn("[MenuService] Aguardando credenciais para buscar menu (primeira carga). Retornando array vazio.");
                return [];
            }

            // Verificar se já tentamos recentemente e usar cache se disponível
            const now = Date.now();
            if (this.menuCache && (now - this.lastFetchAttempt) < this.RETRY_DELAY) {
                console.log("[MenuService] Usando cache do menu devido a tentativa recente");
                return this.menuCache;
            }

            const endpoint = `/me/menu`;

            console.log("[MenuService] Buscando menu dinâmico do endpoint:", endpoint);
            this.lastFetchAttempt = now;

            // apiClient já configura automaticamente a URL dinâmica e Authorization
            const response = await apiClient.get(endpoint);

            console.log("[MenuService] Resposta do menu dinâmico:", response.data);

            // A API retorna um array direto com estrutura hierárquica
            const menuData = response.data;
            console.log(`[MenuService] Menu retornado com ${menuData?.length || 0} categorias`);

            // Processar o menu para expandir "clients" em dois itens separados
            const processedMenu: MenuItem[] = [];

            if (Array.isArray(menuData)) {
                menuData.forEach((category: any) => {
                    if (category.slug === 'operational' && category.items) {
                        // Processar categoria operational especialmente
                        const processedItems: MenuItem[] = [];

                        category.items.forEach((item: any) => {
                            if (item.slug === 'clients') {
                                // Expandir "clients" em dois itens separados
                                console.log("[MenuService] Expandindo item 'clients' em clientes com/sem contrato");
                                console.log("[MenuService] Permissões originais:", item.required_permissions);
                                console.log("[MenuService] Apps originais:", item.required_apps);

                                processedItems.push({
                                    slug: 'clients_with_contract',
                                    title: 'Clientes com Contrato',
                                    required_permissions: item.required_permissions || [],
                                    required_apps: ['web', 'mobile'] // Garantir que mobile está incluído
                                });

                                processedItems.push({
                                    slug: 'clients_without_contract',
                                    title: 'Clientes Avulsos',
                                    required_permissions: item.required_permissions || [],
                                    required_apps: ['web', 'mobile'] // Garantir que mobile está incluído
                                });
                            } else {
                                // Manter outros itens como estão
                                processedItems.push(item);
                            }
                        });

                        processedMenu.push({
                            ...category,
                            items: processedItems
                        });
                    } else {
                        // Manter outras categorias como estão
                        processedMenu.push(category);
                    }
                });
            }

            // Adicionar itens base que sempre devem existir (se não vieram da API)
            const baseItems = ['home', 'personal_data'];
            const existingSlugs = new Set<string>();

            processedMenu.forEach(category => {
                if (category.items) {
                    category.items.forEach(item => existingSlugs.add(item.slug));
                }
            });

            // Adicionar home se não existir
            if (!existingSlugs.has('home')) {
                console.log("[MenuService] Adicionando item 'home' que não veio da API");
                processedMenu.unshift({
                    slug: 'home',
                    title: 'Home',
                    icon: 'home',
                    required_permissions: [],
                    required_apps: ['mobile']
                });
            }

            // Log detalhado do menu processado para debug
            console.log("[MenuService] Menu processado - Total de categorias:", processedMenu.length);
            processedMenu.forEach(category => {
                console.log(`[MenuService] Categoria: ${category.slug}`);
                if (category.items) {
                    category.items.forEach(item => {
                        console.log(`  - Item: ${item.slug} (${item.title || 'sem título'})`);
                    });
                }
            });

            // Salvar no cache e retornar o menu processado
            this.menuCache = processedMenu;
            return processedMenu;
        } catch (error: any) {
            console.error("[MenuService] Erro ao buscar menu dinâmico:", error);

            // Se temos cache, retornar ele ao invés de falhar
            if (this.menuCache) {
                console.warn("[MenuService] Retornando menu do cache devido a erro na API");
                return this.menuCache;
            }

            // Se for erro 500, retornar menu padrão mínimo
            if (error.response?.status === 500) {
                console.error("[MenuService] Erro 500 no servidor. Retornando menu mínimo.");
                const fallbackMenu: MenuItem[] = [
                    {
                        slug: "inicio",
                        title: "Início",
                        icon: "home",
                        items: []
                    }
                ];
                this.menuCache = fallbackMenu;
                return fallbackMenu;
            }

            if (error.response?.status === 404) {
                throw new Error("Endpoint de menu não encontrado. Verifique a configuração do servidor.");
            }
            throw new Error("Não foi possível carregar o menu. Tente novamente mais tarde.");
        }
    }
}
