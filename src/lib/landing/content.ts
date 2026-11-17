import type { Locale } from '$lib/i18n';

// Copy for the public landing page (/conheca). Kept out of the main i18n
// catalogs: it is long-form marketing text that changes on its own schedule.
// Portuguese is the primary market; every other locale gets English.

interface Item {
	title: string;
	text: string;
}

export interface LandingCopy {
	meta: { title: string; description: string };
	nav: {
		home: string;
		features: string;
		lost: string;
		faq: string;
		login: string;
		signup: string;
		dashboard: string;
	};
	hero: {
		titleA: string;
		titleB: string;
		lead: string;
		primary: string;
		secondary: string;
		trust: [string, string, string];
		imageAlt: string;
	};
	features: { title: string; items: [Item, Item, Item, Item] };
	app: {
		title: string;
		points: [string, string, string];
		cta: string;
		imageAlt: string;
	};
	lost: {
		kicker: string;
		title: string;
		body: string;
		steps: Item[];
		note: string;
		poster: {
			heading: string;
			name: string;
			details: string;
			message: string;
			contact: string;
			call: string;
			scan: string;
		};
	};
	together: { kicker: string; title: string; cards: [Item, Item, Item] };
	faq: { title: string; items: { q: string; a: string }[] };
	band: [Item, Item, Item];
	footer: { tagline: string };
}

const pt: LandingCopy = {
	meta: {
		title: 'Achei Meu Pet: saúde, rotina e segurança do seu pet num lugar só',
		description:
			'Vacinas, remédios, passeios, fotos e documentos do seu pet organizados, com lembretes e uma plaquinha com QR que ajuda quem encontrar seu pet a falar com você.'
	},
	nav: {
		home: 'Início',
		features: 'Funcionalidades',
		lost: 'Pet perdido',
		faq: 'Dúvidas',
		login: 'Entrar',
		signup: 'Criar conta grátis',
		dashboard: 'Abrir meu painel'
	},
	hero: {
		titleA: 'Cada pet merece',
		titleB: 'ser contado.',
		lead: 'A saúde, o diário e os cuidados do dia a dia do seu companheiro, organizados num lugar só.',
		primary: 'Começar agora grátis',
		secondary: 'Ver funcionalidades',
		trust: ['Seus dados', 'Pet perdido com QR', 'Seus companheiros'],
		imageAlt:
			'Um coelho, um gato, um golden retriever, uma calopsita e um porquinho-da-índia lado a lado'
	},
	features: {
		title: 'Tudo para o bem-estar do seu pet em um só lugar',
		items: [
			{ title: 'Saúde', text: 'Acompanhe vacinas, consultas, exames, peso e tratamentos.' },
			{ title: 'Rotina', text: 'Organize horários de alimentação, passeios e medicamentos.' },
			{
				title: 'Cuidados',
				text: 'Registre hábitos, bem-estar e lembretes para o que vem pela frente.'
			},
			{ title: 'Diário', text: 'Guarde momentos, fotos e a evolução do seu companheiro.' }
		]
	},
	app: {
		title: 'Organização, cuidado e muito mais amor no dia a dia.',
		points: [
			'Gerencie um ou vários pets',
			'Lembretes por e-mail, notificação ou no calendário do celular',
			'Seus dados sob o seu controle'
		],
		cta: 'Criar minha conta grátis',
		imageAlt:
			'Tela do Achei Meu Pet no notebook com a lista de pets e o aplicativo aberto no celular'
	},
	lost: {
		kicker: 'Pet perdido',
		title: 'Se ele sumir, a coleira fala por você.',
		body: 'Cada pet pode ter uma página pública com nome, foto e o seu telefone, aberta pelo QR code da plaquinha.',
		steps: [
			{
				title: 'Ative e imprima',
				text: 'Ligue a página pública do pet e baixe o QR code para gravar na plaquinha da coleira.'
			},
			{
				title: 'Quem achar, escaneia',
				text: 'A pessoa aponta a câmera do celular e já pode ligar ou chamar você no WhatsApp, sem conta e sem aplicativo.'
			},
			{
				title: 'Sumiu? Vira cartaz',
				text: 'Marque como perdido e a página se transforma num cartaz de "Procura-se", pronto para imprimir e espalhar.'
			}
		],
		note: 'A página mostra só o que ajuda o pet a voltar para casa: nada de dados de saúde nem endereço.',
		poster: {
			heading: 'Procura-se',
			name: 'Thor',
			details: 'Golden retriever · Macho',
			message: 'Visto perto da praça. Coleira vermelha, é manso.',
			contact: 'Falar com a Ana',
			call: 'Ligar',
			scan: 'Aponte a câmera para abrir esta página'
		}
	},
	together: {
		kicker: 'Quem cuida junto',
		title: 'A família, o pet sitter e a clínica. Cada um com o acesso certo.',
		cards: [
			{
				title: 'Família',
				text: 'Todo mundo de casa registra e vê a mesma rotina. Acabou o "achei que você tinha dado o remédio".'
			},
			{
				title: 'Pet sitter',
				text: 'Viajou? O cuidador vê só o pet de que está cuidando, com as instruções que você deixou, e só durante o turno.'
			},
			{
				title: 'Clínica',
				text: 'Compartilhe com o veterinário por um prazo. Ele adiciona consultas e exames, e o histórico continua sendo seu.'
			}
		]
	},
	faq: {
		title: 'Dúvidas frequentes',
		items: [
			{
				q: 'Preciso instalar algum aplicativo?',
				a: 'Não. Funciona no navegador do celular e do computador, e dá para adicionar à tela inicial como um aplicativo.'
			},
			{
				q: 'Como crio minha conta?',
				a: 'Clique em "Criar conta grátis", escolha um nome de usuário e uma senha e cadastre seu primeiro pet. Leva menos de um minuto.'
			},
			{
				q: 'Quem encontra meu pet precisa ter conta?',
				a: 'Não. Basta apontar a câmera para o QR code da plaquinha. A página abre direto, com o botão para ligar.'
			},
			{
				q: 'A clínica fica vendo tudo para sempre?',
				a: 'Só enquanto você permitir. Você escolhe se ela só vê ou também adiciona registros, define até quando e revoga a qualquer momento.'
			},
			{
				q: 'Serve para gatos e outros bichos?',
				a: 'Hoje o cadastro foi pensado para cães. Gatos e outras espécies são os próximos.'
			}
		]
	},
	band: [
		{ title: 'Pet perdido com QR', text: 'Quem encontrar fala com você na hora.' },
		{ title: 'Quantos pets quiser', text: 'Cadastre todos os seus companheiros.' },
		{ title: 'Privacidade e segurança', text: 'Seus dados, no seu controle.' }
	],
	footer: { tagline: 'Saúde, rotina e segurança do seu pet, num lugar só.' }
};

const en: LandingCopy = {
	meta: {
		title: "Achei Meu Pet: your pet's health, routine and safety in one place",
		description:
			"Your pet's vaccines, meds, walks, photos and documents in order, with reminders and a QR collar tag that helps whoever finds your pet reach you."
	},
	nav: {
		home: 'Home',
		features: 'Features',
		lost: 'Lost pet',
		faq: 'FAQ',
		login: 'Log in',
		signup: 'Sign up free',
		dashboard: 'Open my dashboard'
	},
	hero: {
		titleA: 'Every pet deserves',
		titleB: 'to be counted.',
		lead: "Your companion's health, journal and day-to-day care, organised in one place.",
		primary: 'Get started free',
		secondary: 'See features',
		trust: ['Your data', 'Lost pet QR tag', 'Your companions'],
		imageAlt: 'A rabbit, a cat, a golden retriever, a cockatiel and a guinea pig side by side'
	},
	features: {
		title: "Everything for your pet's wellbeing in one place",
		items: [
			{ title: 'Health', text: 'Track vaccines, visits, lab results, weight and treatments.' },
			{ title: 'Routine', text: 'Organise feeding times, walks and medication.' },
			{ title: 'Care', text: "Log habits, wellbeing and reminders for what's coming up." },
			{ title: 'Journal', text: "Keep moments, photos and your companion's story." }
		]
	},
	app: {
		title: 'Organisation, care and a lot more love, every day.',
		points: [
			'Manage one pet or many',
			'Reminders by email, push or your phone calendar',
			'Your data under your control'
		],
		cta: 'Create my free account',
		imageAlt: 'Achei Meu Pet on a laptop showing the pet list, and the app open on a phone'
	},
	lost: {
		kicker: 'Lost pet',
		title: 'If they go missing, the collar speaks for you.',
		body: 'Each pet can have a public page with name, photo and your phone number, opened from the QR code on the tag.',
		steps: [
			{
				title: 'Turn it on and print',
				text: "Enable the pet's public page and download the QR code for the collar tag."
			},
			{
				title: 'Whoever finds them scans',
				text: 'They point their phone camera and can call or WhatsApp you right away, with no account or app.'
			},
			{
				title: 'Missing? It becomes a poster',
				text: 'Mark the pet as lost and the page turns into a "Missing" poster, ready to print and share.'
			}
		],
		note: 'The page only shows what helps your pet get home: no health data and no address.',
		poster: {
			heading: 'Missing',
			name: 'Thor',
			details: 'Golden retriever · Male',
			message: 'Last seen near the square. Red collar, very friendly.',
			contact: 'Contact Ana',
			call: 'Call',
			scan: 'Point your camera here to open this page'
		}
	},
	together: {
		kicker: 'Shared care',
		title: 'Family, pet sitter and clinic. Each with the right access.',
		cards: [
			{
				title: 'Family',
				text: 'Everyone at home logs and sees the same routine. No more "I thought you gave the meds".'
			},
			{
				title: 'Pet sitter',
				text: 'Travelling? The sitter only sees the pet in their care, with your instructions, and only during their shift.'
			},
			{
				title: 'Clinic',
				text: 'Share with your vet for a set period. They add visits and results; the history stays yours.'
			}
		]
	},
	faq: {
		title: 'Questions',
		items: [
			{
				q: 'Do I need to install an app?',
				a: 'No. It works in your phone or computer browser, and you can add it to your home screen like an app.'
			},
			{
				q: 'How do I sign up?',
				a: 'Click "Sign up free", pick a username and password and add your first pet. It takes under a minute.'
			},
			{
				q: 'Does the person who finds my pet need an account?',
				a: 'No. They just point their camera at the QR code on the tag. The page opens with a button to call you.'
			},
			{
				q: 'Does the clinic keep access forever?',
				a: 'Only as long as you allow. You choose view-only or view-and-add, set an end date and revoke at any time.'
			},
			{
				q: 'Does it work for cats and other animals?',
				a: 'Today it is designed for dogs. Cats and other species are next.'
			}
		]
	},
	band: [
		{ title: 'Lost pet QR tag', text: 'Whoever finds them reaches you right away.' },
		{ title: 'As many pets as you like', text: 'Add all of your companions.' },
		{ title: 'Privacy and security', text: 'Your data, under your control.' }
	],
	footer: { tagline: "Your pet's health, routine and safety, in one place." }
};

export function landingCopy(locale: Locale): LandingCopy {
	return locale === 'pt' ? pt : en;
}
