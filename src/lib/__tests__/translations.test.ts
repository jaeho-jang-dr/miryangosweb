import { translations } from '../translations';
import type { Language } from '../translations';

describe('translations', () => {
  const languages: Language[] = ['ko', 'en'];

  it('should have both ko and en translations', () => {
    expect(translations.ko).toBeDefined();
    expect(translations.en).toBeDefined();
  });

  describe('structural consistency', () => {
    it('should have the same top-level keys in both languages', () => {
      const koKeys = Object.keys(translations.ko).sort();
      const enKeys = Object.keys(translations.en).sort();
      expect(koKeys).toEqual(enKeys);
    });

    it('should have matching navbar menu keys', () => {
      const koMenuKeys = Object.keys(translations.ko.navbar.menu).sort();
      const enMenuKeys = Object.keys(translations.en.navbar.menu).sort();
      expect(koMenuKeys).toEqual(enMenuKeys);
    });

    it('should have matching hero keys', () => {
      const koHeroKeys = Object.keys(translations.ko.hero).sort();
      const enHeroKeys = Object.keys(translations.en.hero).sort();
      expect(koHeroKeys).toEqual(enHeroKeys);
    });

    it('should have matching hero button keys', () => {
      const koButtonKeys = Object.keys(translations.ko.hero.buttons).sort();
      const enButtonKeys = Object.keys(translations.en.hero.buttons).sort();
      expect(koButtonKeys).toEqual(enButtonKeys);
    });

    it('should have matching philosophy card keys', () => {
      const koCardKeys = Object.keys(translations.ko.philosophy.cards).sort();
      const enCardKeys = Object.keys(translations.en.philosophy.cards).sort();
      expect(koCardKeys).toEqual(enCardKeys);
    });

    it('should have matching department keys', () => {
      const koDeptKeys = Object.keys(translations.ko.departments).sort();
      const enDeptKeys = Object.keys(translations.en.departments).sort();
      expect(koDeptKeys).toEqual(enDeptKeys);
    });

    it('should have matching footer keys', () => {
      const koFooterKeys = Object.keys(translations.ko.footer).sort();
      const enFooterKeys = Object.keys(translations.en.footer).sort();
      expect(koFooterKeys).toEqual(enFooterKeys);
    });

    it('should have matching hours modal keys', () => {
      const koKeys = Object.keys(translations.ko.hero.hoursModal).sort();
      const enKeys = Object.keys(translations.en.hero.hoursModal).sort();
      expect(koKeys).toEqual(enKeys);
    });
  });

  describe('content completeness', () => {
    for (const lang of languages) {
      describe(`${lang} translations`, () => {
        it('should have non-empty navbar menu items', () => {
          const menu = translations[lang].navbar.menu;
          expect(menu.intro).toBeTruthy();
          expect(menu.departments).toBeTruthy();
          expect(menu.archive).toBeTruthy();
          expect(menu.location).toBeTruthy();
          expect(menu.reservation).toBeTruthy();
        });

        it('should have non-empty hero content', () => {
          const hero = translations[lang].hero;
          expect(hero.badge).toBeTruthy();
          expect(hero.title).toBeTruthy();
          expect(hero.subtitle).toBeTruthy();
        });

        it('should have non-empty department descriptions', () => {
          const depts = translations[lang].departments;
          expect(depts.spine.title).toBeTruthy();
          expect(depts.spine.desc).toBeTruthy();
          expect(depts.joint.title).toBeTruthy();
          expect(depts.joint.desc).toBeTruthy();
          expect(depts.pain.title).toBeTruthy();
          expect(depts.pain.desc).toBeTruthy();
          expect(depts.geriatric.title).toBeTruthy();
          expect(depts.geriatric.desc).toBeTruthy();
          expect(depts.pt.title).toBeTruthy();
          expect(depts.pt.desc).toBeTruthy();
        });

        it('should have footer items as array with 4 entries', () => {
          expect(translations[lang].footer.sections.items).toHaveLength(4);
        });

        it('should have non-empty footer copyright', () => {
          expect(translations[lang].footer.copyright).toBeTruthy();
        });
      });
    }
  });
});
