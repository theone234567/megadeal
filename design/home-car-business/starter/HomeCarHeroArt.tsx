/** Optional artwork-only component. Adapt to the existing project's image abstraction.
 * Copy assets to public/images/home-car-business first.
 * This does not implement the entire page or change the current header logo.
 */
import Image from 'next/image';
import styles from './HomeCarHeroArt.module.css';

export function HomeCarHeroArt() {
  return (
    <div className={styles.art}>
      <Image
        src="/images/home-car-business/hero-home-car-background.png"
        alt=""
        fill
        sizes="(max-width: 760px) 92vw, 48vw"
        className={styles.backdrop}
      />
      <div className={styles.mascot}>
        <Image
          src="/images/home-car-business/mascot-welcome-current.png"
          alt="MegaDeal's welcoming lavender elephant wearing a purple M hoodie"
          fill
          sizes="(max-width: 760px) 56vw, 28vw"
          className={styles.character}
        />
      </div>
    </div>
  );
}
