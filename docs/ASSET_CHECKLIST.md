# Asset checklist — ce que tu produis, ce que je génère

Objectif : remplacer mes plaques IA (déjà bonnes) par les **frames exactes** des vraies montres,
puis les passer en HD via Higgsfield. Toi tu fais les **prises produit réelles** (screenshots des
vidéos de Peter) ; moi je garde/refais les **éditions team + les plaques in-scene** (IA).

Montres : **A007 = Encrypto (noire, pavé black diamond)** · **A008 = XDC (rainbow pavé, blanche)**.

---

## 1) TOI — screenshots des montres (depuis les vidéos Dropbox), par montre

Pour chaque montre, une image nette par position. Pause sur une frame **sans flou de mouvement**,
capture à la **résolution max**, montre centrée, fond le plus neutre possible.

| # | Position | À quoi ça sert | Nom de fichier |
|---|---|---|---|
| 1 | **Face / front** (cadran à plat) | hero / showcase | `encrypto-front.png` / `xdc-front.png` |
| 2 | **3-quart** (~30°) | reveals dynamiques, orbites | `encrypto-3q.png` / `xdc-3q.png` |
| 3 | **Macro cadran** (QR + centre) | beats détail, unboxing/ASMR | `encrypto-macro.png` / `xdc-macro.png` |
| 4 | **Profil / côté** (boîtier + couronne) | épaisseur, luxe | `encrypto-profile.png` / `xdc-profile.png` |
| 5 | **Au poignet** (porté) | shots lifestyle « worn » | `encrypto-wrist.png` / `xdc-wrist.png` |
| 6 | *(optionnel)* **Caseback / fond** | détail collector | `encrypto-back.png` / `xdc-back.png` |

→ **10 à 12 screenshots au total** (5-6 × 2 montres). C'est le seul « travail manuel ».

## 2) Puis HD via Higgsfield (2 méthodes, au choix selon l'usage)

- **Upscale (exact, recommandé pour macro + face)** : `upscale_image` → 2K/4K. Garde la montre
  **identique** (QR, pavé, chiffres), juste plus net/débruité. Zéro dérive.
- **Regénération cinématique (pour hero / 3-quart / scènes)** : `nano_banana_pro` avec le screenshot
  en **référence** → still studio propre (fond sombre, lumière ciné). Léger restylage possible, look pub.

→ Tu me déposes les screenshots (ou les liens), je fais la passe HD + je les registre. **Aucun code à toucher.**

## 3) MOI — pas besoin de footage (je génère/garde)

- **Éditions World Cup** (recolor) : Encrypto France 🇫🇷 / Brazil 🇧🇷 / Argentina 🇦🇷 **déjà faites**.
  À la demande : mêmes éditions pour la **XDC**, + autres nations (Angleterre, Espagne, Maroc, USA…).
- **Plaques in-scene** : showroom + penthouse **déjà faites** (les 2 montres). À la demande :
  marble lounge, executive office, luxury district, riviera terrace.
- Dès que j'ai tes **vraies frames**, je peux même **régénérer les team/scène à partir d'elles**
  (fidélité encore meilleure).

## 4) Avatars (créateurs) — pour le mode « avatar » (direct-to-camera / tutorial)

Nos 5 créateurs sont synthétiques. Par créateur, deux briques Higgsfield :

| Brique | Ce qu'il faut | Résultat |
|---|---|---|
| **Soul** (identité réutilisable) | 5-20 photos du perso (angles/expressions variés) OU 1 portrait → je le décline | perso consistant dans plein de poses/scènes |
| **Avatar Marketing Studio** | 1 portrait net (ou court clip) | avatar qui présente le produit (parle/silencieux) |

+ **La montre en tant que produit MS** (`ms_product_id`) : à créer une fois dans Marketing Studio
pour que l'avatar tienne la **bonne** montre (c'est ce qui manquait quand ça ne prenait pas la montre).

→ Je peux générer un **portrait de base par créateur** (soul_2) sur ton go, puis créer l'avatar MS.

## 5) Où ça se branche (récap technique)

- Product / wrist / scene / team → `frontend/public/brand/refs/` + registre `lib/rwa/references.ts`.
- Avatars → `persona.ms_avatar_id` et watch `ms_product_id` dans `lib/rwa/catalog.ts`.
- Endpoint live avatar → `HIGGSFIELD_MS_ENDPOINT` (voir `PRODUCTION.md`).

---

### Résumé ultra-court
1. **Toi** : 5-6 screenshots par montre (front, 3-quart, macro, profil, poignet) = ~10-12 images.
2. **Moi** : passe HD (upscale/regen) + team + scènes + je registre tout.
3. **Avatars** (sur go) : 1 portrait par créateur + la montre en produit MS.
