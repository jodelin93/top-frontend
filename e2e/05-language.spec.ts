/**
 * Switching the interface language on the POS (header EN / FR / HT / ES switcher)
 * and checking translated labels. The expected texts are those of
 * src/i18n/{fr,ht,es}/pos.ts.
 */
import { expect, openPos, test } from './fixtures';

const LANGUAGES = [
  {
    code: 'fr',
    title: 'Français',
    cartEmpty: 'Le panier est vide',
    search: 'Rechercher des produits ou scanner un code-barres',
    clearCart: 'Vider le panier',
  },
  {
    code: 'ht',
    title: 'Kreyòl ayisyen',
    cartEmpty: 'Panye a vid',
    search: 'Chèche pwodui oswa eskane yon kòd ba',
    clearCart: 'Vide panye a',
  },
  {
    code: 'es',
    title: 'Español',
    cartEmpty: 'El carrito está vacío',
    search: 'Buscar productos o escanear un código de barras',
    clearCart: 'Vaciar carrito',
  },
  {
    code: 'en',
    title: 'English',
    cartEmpty: 'Cart is empty',
    search: 'Search products or scan a barcode',
    clearCart: 'Clear cart',
  },
];

test('switches the POS between English, French, Haitian Creole and Spanish', async ({ page, store }) => {
  await openPos(page, store.registerId!);
  const cart = page.getByRole('complementary');
  await expect(cart.getByText('Cart is empty', { exact: true })).toBeVisible();

  for (const lang of LANGUAGES) {
    await test.step(lang.title, async () => {
      // The switcher buttons are titled with each language's own name
      const option = page.getByRole('banner').getByTitle(lang.title, { exact: true });
      await option.click();
      await expect(option).toHaveAttribute('aria-checked', 'true');

      await expect(cart.getByText(lang.cartEmpty, { exact: true })).toBeVisible();
      await expect(page.getByLabel(lang.search, { exact: true })).toBeVisible();
      await expect(cart.getByRole('button', { name: lang.clearCart, exact: true })).toBeVisible();
      // The other languages' texts are gone
      for (const other of LANGUAGES.filter((l) => l.code !== lang.code)) {
        await expect(cart.getByText(other.cartEmpty, { exact: true })).toHaveCount(0);
      }
    });
  }
});
