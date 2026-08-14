# MedChat — нативный клиент Shifo24

Мобильное приложение поверх того же бэкенда, что и TrueGis Mini App, заскоупленное на одного
партнёра — **Shifo24** (`partner = 6932ea73d763c1eb641fe46f`). Expo SDK 57 + expo-router.

## Запуск

```bash
npm install
npx expo start        # затем i (iOS), a (Android), w (web)
```

По умолчанию приложение ходит на `https://dev.admin13.uz`. Другой хост — через `.env`
(см. `.env.example`, переменная `EXPO_PUBLIC_API_HOST`).

## Навигация

Нижней панели нет. Три экрана в стеке, вход закрывает всё остальное:

| Маршрут    | Файл                  | Что это                                        |
| ---------- | --------------------- | ---------------------------------------------- |
| `/login`   | `src/app/login.tsx`   | Вход через Telegram (пока нет сессии)           |
| `/`        | `src/app/index.tsx`   | Чат с ИИ Shifo24 (корневой экран)               |
| `/profile` | `src/app/profile.tsx` | Профиль, открывается по аватарке в шапке чата   |

Гейт — `Stack.Protected` в [_layout.tsx](src/app/_layout.tsx): пока сессия читается из keychain,
поверх висит сплэш, поэтому экран входа не мигает у авторизованного пользователя.

## Авторизация

`initData` мини-аппа нативному приложению недоступен, поэтому вход идёт через бота:

1. `POST /delivery/bot/auth/mobile/start` → одноразовый код + `t.me/<bot>?start=…`;
2. пользователь жмёт «Start», бот отдаёт свою личность в `/auth/mobile/bind`;
3. приложение опрашивает `/auth/mobile/exchange` и получает ту же пару access/refresh,
   что мини-апп получает от `/auth/telegram`.

Токены лежат в `expo-secure-store`; [api.ts](src/services/api.ts) подставляет Bearer и один раз
прозрачно обновляет токен на 401 — как baseQuery в вебе.

## Чат

[use-chat-stream.ts](src/hooks/use-chat-stream.ts) читает SSE из `POST /delivery/bot/chat/stream`
через `expo/fetch` (у RN-фетча нет стриминга). Дальше [use-chat.ts](src/hooks/use-chat.ts):
вырезает из ответа служебный JSON, показывает текст, гоняет `company/search` с `company_type`
партнёра и рисует карточки клиник. Чипы специальностей — публичный `/delivery/bot/types`.

Что уже есть: стрим, маркдаун, чипы, подсказки, карточки клиник, история чатов, избранное.
Второй этап: голосовой ввод, файлы, генерация картинок, лимиты и оплата тарифа.

## Структура

```
src/
  app/          экраны (file-based routing)
  components/   UI: общие + chat/ + profile/
  features/     auth/ (сессия) + chat/ (шторка истории)
  hooks/        use-chat, use-chat-stream, use-partner, тема
  services/     api, auth, chat, catalog, token-store
  i18n/         uz / cyrl / ru / en
  constants/    config (хост, PARTNER_ID) + дизайн-токены
```

## Серверная часть

Эндпоинты входа живут в TrueGisServer рядом с остальными `bot`-контроллерами
(`controllers/bot/auth/mobile-*.js`), ветка `mobileLogin` — в `/start` бота BotHeart.
Перед первым деплоем прогнать индексы:

```bash
node src/v1/migrations/mobile-login-codes-indexes.js
```
