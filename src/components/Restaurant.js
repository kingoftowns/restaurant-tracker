import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { saveRestaurant, getRestaurants } from '../services/database';

const Restaurant = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [newEntry, setNewEntry] = useState({
    name: '',
    location: '',
    dish: '',
    rating: 0,
    date: new Date().toISOString().split('T')[0]
  });
  const [recommendation, setRecommendation] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const data = await getRestaurants();
      setRestaurants(data);
    };
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const saved = await saveRestaurant(newEntry);
    setRestaurants([saved, ...restaurants]);
    setNewEntry({
      name: '',
      location: '',
      dish: '',
      rating: 5,
      date: new Date().toISOString().split('T')[0]
    });
  };

  const getRecommendation = () => {
    if (restaurants.length === 0) {
      console.log('No restaurants found');
      setRecommendation('No restaurant data available yet!');
      return;
    }

    console.log('Current restaurants:', restaurants);

    const restaurantStats = restaurants.reduce((acc, visit) => {
      if (!acc[visit.name]) {
        acc[visit.name] = {
          visits: 0,
          avgRating: 0,
          totalRating: 0,
          lastVisit: visit.date,
          location: visit.location
        };
      }
      acc[visit.name].visits += 1;
      acc[visit.name].totalRating += visit.rating;
      acc[visit.name].avgRating = acc[visit.name].totalRating / acc[visit.name].visits;
      if (new Date(visit.date) > new Date(acc[visit.name].lastVisit)) {
        acc[visit.name].lastVisit = visit.date;
      }
      return acc;
    }, {});

    const scored = Object.entries(restaurantStats).map(([name, stats]) => {
      const daysSinceLastVisit = Math.floor(
        (new Date() - new Date(stats.lastVisit)) / (1000 * 60 * 60 * 24)
      );
      const score = (
        (stats.avgRating * 0.4) + 
        (stats.visits * 0.3) + 
        (daysSinceLastVisit > 30 ? 0.3 : 0)
      );
      return { name, score, stats };
    });

    const topPicks = scored.sort((a, b) => b.score - a.score).slice(0, 2);
    console.log('Top pick:', topPicks);
    setRecommendation(
      `Top picks:\n1. ${topPicks[0].name} in ${topPicks[0].stats.location} ` +
      `(${topPicks[0].stats.visits} visits, ${topPicks[0].stats.avgRating.toFixed(1)}/5)\n` +
      `2. ${topPicks[1].name} in ${topPicks[1].stats.location} ` +
      `(${topPicks[1].stats.visits} visits, ${topPicks[1].stats.avgRating.toFixed(1)}/5)`
    );
    
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl mb-4">Restaurant Tracker</h1>
      
      <div className="mb-8">
        <h2 className="text-xl mb-4">Add New Visit</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            className="block w-full p-2 border mb-2"
            placeholder="Restaurant Name"
            value={newEntry.name}
            onChange={(e) => setNewEntry({...newEntry, name: e.target.value})}
            required
          />
          <input
            className="block w-full p-2 border mb-2"
            placeholder="Location"
            value={newEntry.location}
            onChange={(e) => setNewEntry({...newEntry, location: e.target.value})}
            required
          />
          <input
            className="block w-full p-2 border mb-2"
            placeholder="What did you order?"
            value={newEntry.dish}
            onChange={(e) => setNewEntry({...newEntry, dish: e.target.value})}
            required
          />
         <div className="flex flex-row items-center">
            <span>Rating:</span>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-6 h-6 cursor-pointer ${
                  star <= newEntry.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                }`}
                onClick={() => setNewEntry({...newEntry, rating: star})}
              />
            ))}
          </div>
          <input
            className="block w-full p-2 border mb-2"
            type="date"
            value={newEntry.date}
            onChange={(e) => setNewEntry({...newEntry, date: e.target.value})}
            required
          />
          <button 
            type="submit"
            className="block w-full p-2 bg-blue-500 text-white"
          >
            Add Entry
          </button>
        </form>
      </div>
      <div>
        <button 
          onClick={getRecommendation}
          className="block w-full p-2 mb-4 bg-green-500 text-white"
        >
          Get Recommendation
        </button>
        {recommendation && (
          <div className="p-4 bg-gray-100 border mb-4">
            {recommendation}
          </div>
        )}
      </div>
      <div className="mb-4">
        <h2 className="text-xl mb-4">Previous Visits</h2>
        <div className="space-y-4">
            {restaurants.map((entry) => (
              <div key={entry._id} className="p-4 bg-gray-50 rounded-md border border-gray-200">
                <div className="font-semibold text-gray-900">{entry.name}</div>
                <div className="text-sm text-gray-600">{entry.location}</div>
                <div className="text-sm text-gray-800 mt-1">Ordered: {entry.dish}</div>
                <div className="flex items-center space-x-1 mt-2">
                  {Array.from({ length: entry.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  {new Date(entry.date).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
      </div>
    </div>
  );
}

export default Restaurant;