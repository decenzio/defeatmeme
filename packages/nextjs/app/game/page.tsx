"use client";

import Image from "next/image";
import styles from "../../styles/Game.module.css";

const GamePage = () => {
  return (
    <div className={styles.gameContainer}>
      {/* Background Image - Rotated 90 degrees */}
      <div className={styles.backgroundImage} />

      {/* Game Content */}
      <div className={styles.gameContent}>
        {/* Left Side - Planet */}
        <div className={styles.leftSide}>
          <div className={styles.planetContainer}>
            {/* Cat Above Planet */}
            <div className={styles.catUp}>
              <Image src="/cat/cat1.png" alt="Cat Above" width={100} height={100} />
            </div>

            {/* Planet Circle Background */}
            <div className={styles.planetCircle}>
              {/* Planet Images Container */}
              <div className={styles.planetImagesContainer}>
                {/* Planet 1 */}
                <div className="relative">
                  <Image
                    src="/planet/planet2.png"
                    alt="Planet 1"
                    width={520}
                    height={520}
                    className={`${styles.planetImage} ${styles.planet1}`}
                  />
                </div>

                {/* Planet 2 (now in bottom position) */}
                <div className="relative">
                  <Image
                    src="/planet/planet1.png"
                    alt="Planet 2"
                    width={520}
                    height={520}
                    className={`${styles.planetImage} ${styles.planet3}`}
                  />
                </div>
              </div>
            </div>

            {/* Cat Below Planet */}
            <div className={styles.catDown}>
              <Image src="/cat/cat3.png" alt="Cat Below" width={100} height={100} />
            </div>

            {/* Orbital Ring Effect */}
            <div className={styles.orbitalRing} />
          </div>
        </div>

        {/* Right Side - Blank Space for Future Content */}
        <div className={styles.rightSide}>{/* This space is intentionally left blank for future game elements */}</div>
      </div>
    </div>
  );
};

export default GamePage;
