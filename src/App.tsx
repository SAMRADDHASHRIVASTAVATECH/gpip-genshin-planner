/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import Layout from "./components/Layout";
import UnifiedPlanner from "./components/UnifiedPlanner";
import AcquisitionPlanner from "./components/AcquisitionPlanner";
import SyncManager from "./components/SyncManager";
import { AnimatePresence, motion } from "motion/react";

export default function App() {
  const [activeTab, setActiveTab] = useState("acquisition"); // Defaulting to acquisition to showcase it

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {activeTab === "planner" && <UnifiedPlanner />}
          {activeTab === "acquisition" && <AcquisitionPlanner />}
          {activeTab === "sync"    && <SyncManager />}
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
}